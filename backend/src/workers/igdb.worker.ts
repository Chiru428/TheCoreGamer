import { Worker, type Job, connection, isConnectionError, igdbSyncQueue } from "@/lib/bullmq";
import type { IGDBImportJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { getIGDBGame, mapIGDBGameToDb } from "@/lib/igdb";
import { cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { syncGameToAlgolia } from "./algolia.worker";

const SYNC_BATCH_SIZE = 50;

// Register the nightly refresh (3 AM) for IGDB rating/popularity fields
igdbSyncQueue.add(
  "nightly-sync",
  {},
  {
    repeat: { pattern: "0 3 * * *" },
    jobId: "igdb-nightly-sync",
  }
).catch((err) => {
  if (!isConnectionError(err)) {
    logger.error({ err }, "[IGDBWorker] Failed to schedule repeatable job");
  }
});

async function handleImportGame(data: IGDBImportJobData) {
  const { igdbId, gameId } = data;
  logger.info(`[IGDBWorker] Importing IGDB game ${igdbId} into Game ${gameId}`);

  const igdbGame = await getIGDBGame(igdbId);
  const mapped = mapIGDBGameToDb(igdbGame);

  const game = await prisma.game.findUnique({ where: { id: gameId } });

  // Cover/background images are managed via the game form — never let a
  // background resync overwrite the admin's chosen images.
  delete mapped.coverImageUrl;
  delete mapped.backgroundImageUrl;

  // Never overwrite the local title/slug from a background sync
  delete mapped.title;
  delete mapped.igdbSlug;

  // Preserve user-curated scalar fields if they already exist in the DB
  if (game?.developer) delete mapped.developer;
  if (game?.publisher) delete mapped.publisher;
  if (game?.description) delete mapped.description;
  if (game?.releaseDate) delete mapped.releaseDate;
  if (game?.platforms?.length) delete mapped.platforms;
  if (game?.genres?.length) delete mapped.genres;
  if (game?.tags?.length) delete mapped.tags;
  if (game?.themes?.length) delete mapped.themes;
  if (game?.keywords?.length) delete mapped.keywords;
  if (game?.steamAppId) delete mapped.steamAppId;
  if (game?.esrbRating) delete mapped.esrbRating;
  if (game?.pegiRating) delete mapped.pegiRating;

  // Merge website links instead of replacing them outright, so curated
  // links that IGDB doesn't (or no longer) reports aren't lost on resync.
  const existingWebsites = (game?.websitesJson as Record<string, string> | null) || {};
  const newWebsites = (mapped.websitesJson as Record<string, string | undefined> | undefined) || {};
  const mergedWebsites: Record<string, string> = { ...existingWebsites };
  for (const [key, value] of Object.entries(newWebsites)) {
    if (value) mergedWebsites[key] = value;
  }
  mapped.websitesJson = mergedWebsites as unknown as typeof mapped.websitesJson;

  const updated = await withRetry(() =>
    prisma.game.update({
      where: { id: gameId },
      data: mapped,
    })
  );

  await cacheSet(`igdb:game:${igdbId}`, igdbGame, CACHE_TTL.DAY);
  await cacheDeletePattern("games:list:*");

  logger.info(`[IGDBWorker] Imported "${updated.title}" (IGDB ${igdbId})`);
}

async function handleNightlySync() {
  logger.info("[IGDBWorker] Starting nightly IGDB sync");

  try {
    const staleGames = await prisma.game.findMany({
      where: {
        releaseStatus: "Coming Soon",
        releaseDate: { lte: new Date() },
      },
      select: { id: true },
    });
    
    if (staleGames.length > 0) {
      const staleIds = staleGames.map(g => g.id);
      await prisma.game.updateMany({
        where: { id: { in: staleIds } },
        data: { releaseStatus: "Released" },
      });
      
      for (const id of staleIds) {
        syncGameToAlgolia(id).catch(err => 
          logger.warn({ err }, `[IGDBWorker] Failed to sync updated status for game ${id}`)
        );
      }
      logger.info(`[IGDBWorker] Updated ${staleIds.length} stale "Coming Soon" statuses to "Released"`);
    }
  } catch (err) {
    logger.warn({ err }, "[IGDBWorker] Failed to sweep stale Coming Soon games");
  }


  let cursor: string | undefined;
  let refreshed = 0;
  let failed = 0;

  while (true) {
    const games = await prisma.game.findMany({
      where: { igdbId: { not: null } },
      select: { id: true, igdbId: true, title: true },
      take: SYNC_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (games.length === 0) break;
    cursor = games[games.length - 1].id;

    for (const game of games) {
      if (!game.igdbId) continue;
      try {
        const igdbGame = await getIGDBGame(game.igdbId);
        await withRetry(() => 
          prisma.game.update({
            where: { id: game.id },
            data: {
              totalRating: igdbGame.aggregated_rating ?? null,
              totalRatingCount: igdbGame.aggregated_rating_count ?? null,
            },
          })
        );
        // Re-sync to Algolia so totalRating sort fields stay fresh
        // (Top Rated and Most Popular sort replicas use these fields).
        syncGameToAlgolia(game.id).catch((err) =>
          logger.warn({ err }, `[IGDBWorker] Algolia re-sync failed for "${game.title}"`)
        );
        refreshed++;
      } catch (err) {
        failed++;
        logger.warn({ err }, `[IGDBWorker] Nightly sync failed for "${game.title}"`);
      }
      // IGDB free tier allows 4 req/s — stay well under it
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (games.length < SYNC_BATCH_SIZE) break;
  }

  await cacheDeletePattern("games:list:*");
  logger.info(`[IGDBWorker] Nightly sync complete. Refreshed ${refreshed}, failed ${failed}.`);
}

export const igdbWorker = new Worker(
  "igdb-sync",
  async (job: Job) => {
    try {
      if (job.name === "import-game") {
        await handleImportGame(job.data as IGDBImportJobData);
      } else if (job.name === "nightly-sync") {
        await handleNightlySync();
      } else {
        logger.warn(`[IGDBWorker] Unknown job name: ${job.name}`);
      }
    } catch (err) {
      captureError(err);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

igdbWorker.on("failed", (job, err) => {
  logger.error({ err }, `[IGDBWorker] Job ${job?.id} (${job?.name}) failed`);
  captureError(err);
});

igdbWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[IGDBWorker] Worker connection error");
  captureError(err);
});

igdbWorker.on("completed", (job) => {
  logger.info(`[IGDBWorker] Job ${job.id} (${job.name}) completed`);
});
