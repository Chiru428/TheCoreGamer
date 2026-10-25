import { Worker, type Job, connection, isConnectionError, igdbSyncQueue } from "@/lib/bullmq";
import type { IGDBImportJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { getIGDBGame, mapIGDBGameToDb, getIGDBRatingsBatch } from "@/lib/igdb";
import { cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { syncGameToAlgolia, buildGameRecordById, bulkSyncGamesToAlgolia } from "./algolia.worker";


// Register the refresh for IGDB rating/popularity fields.
// Runs every 3 days at 3 AM UTC instead of nightly — ratings change slowly
// and this is the largest single outbound bandwidth event on the Render worker.
igdbSyncQueue.add(
  "nightly-sync",
  {},
  {
    repeat: { pattern: "0 3 */3 * *" },
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


  // ── Bandwidth-efficient batch rating sync ─────────────────────────────────
  // Previously called getIGDBGame() (2 HTTP requests, 50+ fields) per game,
  // consuming 3–4 GB per run. Now we fetch ONLY the 3 rating fields for 500
  // games per API call — reducing outbound traffic by ~99%.

  // 1. Load all games with an igdbId from the DB in one query
  const allGames = await prisma.game.findMany({
    where: { igdbId: { not: null } },
    select: { id: true, igdbId: true, title: true },
    orderBy: { id: "asc" },
  });

  let refreshed = 0;
  let failed = 0;

  // 2. Process in chunks of 500 (IGDB Apicalypse hard limit per request)
  const IGDB_BATCH = 500;
  for (let i = 0; i < allGames.length; i += IGDB_BATCH) {
    const chunk = allGames.slice(i, i + IGDB_BATCH);
    const igdbIds = chunk.map((g) => g.igdbId!).filter((id): id is number => id != null);

    let ratingsMap: Map<number, { aggregated_rating?: number; aggregated_rating_count?: number }>;
    try {
      // Single API call returns ratings for up to 500 games
      const ratings = await getIGDBRatingsBatch(igdbIds);
      ratingsMap = new Map(ratings.map((r) => [r.id, r]));
    } catch (err) {
      failed += chunk.length;
      logger.warn({ err }, `[IGDBWorker] Nightly sync batch failed (chunk ${i}–${i + chunk.length})`);
      // Brief pause before next chunk on error
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    // 3. Bulk-update DB rows for this chunk
    const updatedGameIds: string[] = [];
    for (const game of chunk) {
      if (!game.igdbId) continue;
      const rating = ratingsMap.get(game.igdbId);
      // Skip if IGDB returned no entry for this ID (unlisted/removed game)
      if (!rating) continue;
      try {
        await withRetry(() =>
          prisma.game.update({
            where: { id: game.id },
            data: {
              totalRating: rating.aggregated_rating ?? null,
              totalRatingCount: rating.aggregated_rating_count ?? null,
            },
          })
        );
        updatedGameIds.push(game.id);
        refreshed++;
      } catch (err) {
        failed++;
        logger.warn({ err }, `[IGDBWorker] DB update failed for "${game.title}"`);
      }
    }

    // 4. Flush this chunk to Algolia in one batched call
    if (updatedGameIds.length > 0) {
      bulkSyncGamesToAlgolia(updatedGameIds).catch((err) =>
        logger.warn({ err }, "[IGDBWorker] Batched Algolia sync failed")
      );
    }

    // Respect IGDB rate limit (4 req/s free tier) — 1s between batch calls
    if (i + IGDB_BATCH < allGames.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
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
