import { Worker, type Job, connection, isConnectionError, dealsQueue } from "@/lib/bullmq";
import type { DealsJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { resolveItadId, getPrices } from "@/lib/itad";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { triggerFrontendRevalidation } from "@/lib/revalidate";

const BATCH_SIZE = 50;

export function startDealsWorker() {
  dealsQueue.add(
    "poll-prices",
    { trigger: "poll" },
    {
      repeat: { pattern: "0 * * * *" },
      jobId: "deals-poll-hourly",
    }
  ).catch((err) => {
    if (!isConnectionError(err)) {
      logger.error({ err }, "[DealsWorker] Failed to schedule repeatable job");
    }
  });
  return dealsWorker;
}

export const dealsWorker = new Worker<DealsJobData>(
  "deals",
  async (_job: Job<DealsJobData>) => {
    try {
      logger.info("[DealsWorker] Starting price poll");
      const pollTime = new Date(_job.timestamp || Date.now());

      // 1. Fetch all games with a steamAppId in batches of 50
      let cursor: string | undefined;
      let processed = 0;
      // Collect slugs of every game for which we write new snapshots so we can
      // bust the frontend ISR cache after the batch is done.
      const revalidatedSlugs = new Set<string>();

      while (true) {
        const games = await prisma.game.findMany({
          select: { id: true, steamAppId: true, title: true, slug: true },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        });

        if (games.length === 0) break;
        cursor = games[games.length - 1].id;

        // 2. Resolve ITAD IDs for each game (falls back to title search for
        // games with no Steam release, e.g. Epic-exclusive titles)
        const itadMappings: Array<{ gameId: string; itadId: string; gameTitle: string; gameSlug: string }> = [];

        for (const game of games) {
          const itadId = await resolveItadId(game.id, game.steamAppId, game.title);
          await new Promise((r) => setTimeout(r, 150));
          if (!itadId) {
            logger.debug(`[DealsWorker] No ITAD match for game ${game.title}`);
            continue;
          }
          itadMappings.push({ gameId: game.id, itadId, gameTitle: game.title, gameSlug: game.slug });
        }

        if (itadMappings.length === 0) {
          if (games.length < BATCH_SIZE) break;
          processed += games.length;
          continue;
        }

        // 3. Fetch prices from ITAD in batches of 50
        const itadIds = itadMappings.map((m) => m.itadId);
        const prices = await getPrices(itadIds);

        if (prices.length > 0) {
          // 4. Write PriceSnapshot rows (bulk create)
          // We switched from 1-by-1 upserts to bulk creation to prevent connection pool exhaustion.
          // The cleanup logic below handles pruning old data.
          const snapshotData = prices
            .map((p) => {
              const mapping = itadMappings.find((m) => m.itadId === p.gameId);
              if (!mapping) return null;
              // Track slugs of games that received new price data
              revalidatedSlugs.add(mapping.gameSlug);
              return {
                gameId: mapping.gameId,
                shop: p.shop,
                priceINR: p.price,
                regularINR: p.regular,
                storeLowINR: p.storeLow,
                cutPercent: p.cut,
                voucher: p.voucher,
                expiry: p.expiry ? new Date(p.expiry) : null,
                drm: p.drm,
                url: p.url,
                recordedAt: pollTime,
              };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null);

          if (snapshotData.length > 0) {
            // Use createMany for high-performance bulk insertion
            const created = await prisma.priceSnapshot.createMany({
              data: snapshotData,
              skipDuplicates: true, // Idempotent inserts with unique constraint
            });
            logger.info(`[DealsWorker] Bulk wrote ${created.count} price snapshots`);
          }
        }

        processed += games.length;
        if (games.length < BATCH_SIZE) break;
      }

      // 5. Trigger Next.js ISR revalidation for every game page that received
      // updated prices. Without this the frontend serves stale ISR-cached data
      // until the page's revalidate TTL naturally expires (up to 10 minutes).
      if (revalidatedSlugs.size > 0) {
        logger.info(`[DealsWorker] Revalidating ${revalidatedSlugs.size} game page(s)`);
        // Fire-and-forget in small concurrent batches to avoid hammering the frontend
        const slugList = Array.from(revalidatedSlugs);
        const REVALIDATE_BATCH = 10;
        for (let i = 0; i < slugList.length; i += REVALIDATE_BATCH) {
          await Promise.allSettled(
            slugList.slice(i, i + REVALIDATE_BATCH).map((slug) =>
              triggerFrontendRevalidation(`/games/${slug}`)
            )
          );
        }
        logger.info(`[DealsWorker] ISR revalidation triggered for ${revalidatedSlugs.size} game(s)`);
      }

      // Cleanup: delete price snapshots older than 7 days.
      // Note: if this table grows into millions of rows, switch to raw SQL chunked deletes.
      try {
        const now = new Date();
        const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
        const { count } = await prisma.priceSnapshot.deleteMany({
          where: { recordedAt: { lt: cutoff } },
        });
        logger.info(`[DealsWorker] Cleaned up ${count} old price snapshots`);
      } catch (err) {
        logger.warn({ err }, "[DealsWorker] Cleanup of old price snapshots failed");
      }

      logger.info(`[DealsWorker] Poll complete. Processed ${processed} games.`);
    } catch (err) {
      captureError(err);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

dealsWorker.on("failed", (job, err) => {
  logger.error({ err }, `[DealsWorker] Job ${job?.id} failed`);
  captureError(err);
});

dealsWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[DealsWorker] Worker connection error");
  captureError(err);
});

dealsWorker.on("completed", (job) => {
  logger.info(`[DealsWorker] Job ${job.id} completed`);
});
