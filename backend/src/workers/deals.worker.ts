import { Worker, type Job, connection, isConnectionError, dealsQueue } from "@/lib/bullmq";
import type { DealsJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { resolveItadId, getPrices } from "@/lib/itad";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { triggerFrontendRevalidationBatch } from "@/lib/revalidate";

const BATCH_SIZE = 50;

// Rolling window: keep exactly the last 5 days (today inclusive) of snapshots.
// Anything older than 120 hours from now is deleted.
const RETENTION_MS = 5 * 24 * 60 * 60 * 1000; // 120 hours

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

      // ── 1. Fetch all games in batches ──────────────────────────────────────
      let cursor: string | undefined;
      let processed = 0;
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

        // ── 2. Resolve ITAD IDs ────────────────────────────────────────────
        const itadMappings: Array<{
          gameId: string;
          itadId: string;
          gameTitle: string;
          gameSlug: string;
        }> = [];

        for (const game of games) {
          const itadId = await resolveItadId(game.id, game.steamAppId, game.title);
          await new Promise((r) => setTimeout(r, 150));
          if (!itadId) {
            logger.debug(`[DealsWorker] No ITAD match for game ${game.title}`);
            continue;
          }
          itadMappings.push({
            gameId: game.id,
            itadId,
            gameTitle: game.title,
            gameSlug: game.slug,
          });
        }

        if (itadMappings.length === 0) {
          if (games.length < BATCH_SIZE) break;
          processed += games.length;
          continue;
        }

        // ── 3. Fetch prices from ITAD ──────────────────────────────────────
        const itadIds = itadMappings.map((m) => m.itadId);
        const prices = await getPrices(itadIds);

        if (prices.length > 0) {
          // ── 4. Smart insert: only store if price changed OR no snapshot
          //       exists in the last 24 hours (ensures current price is always
          //       available even for stable-priced games).
          //
          //   WHY: Previously we wrote a new row every hour regardless of
          //   whether the price changed, accumulating ~37,000 rows/day. With
          //   this approach we only write when meaningful — reducing storage
          //   by ~90% while keeping full price-change history. ──────────────

          const gameIds = itadMappings.map((m) => m.gameId);

          // Fetch the most recent snapshot for every game+shop pair in one query
          const recentSnapshots = await prisma.priceSnapshot.findMany({
            where: {
              gameId: { in: gameIds },
              recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            select: { gameId: true, shop: true, priceINR: true },
          });

          // Build a lookup map: "gameId:shop" → last known price
          const lastPriceMap = new Map<string, string>();
          for (const s of recentSnapshots) {
            lastPriceMap.set(`${s.gameId}:${s.shop}`, s.priceINR.toString());
          }

          const snapshotData = prices
            .map((p) => {
              const mapping = itadMappings.find((m) => m.itadId === p.gameId);
              if (!mapping) return null;

              const key = `${mapping.gameId}:${p.shop}`;
              const lastPrice = lastPriceMap.get(key);
              const currentPrice = p.price.toString();

              // Skip if price hasn't changed AND we already have a recent snapshot
              const priceChanged = lastPrice !== currentPrice;
              const hasRecentSnapshot = lastPrice !== undefined;

              if (!priceChanged && hasRecentSnapshot) {
                return null; // no change, no need to write
              }

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
            const created = await prisma.priceSnapshot.createMany({
              data: snapshotData,
              skipDuplicates: true,
            });
            logger.info(
              `[DealsWorker] Wrote ${created.count} price snapshots (${prices.length - snapshotData.length} skipped — no change)`
            );
          } else {
            logger.info("[DealsWorker] No price changes detected this poll — no rows written");
          }
        }

        processed += games.length;
        if (games.length < BATCH_SIZE) break;
      }

      // ── 5. Revalidate ISR for changed game pages ───────────────────────────
      if (revalidatedSlugs.size > 0) {
        const slugList = Array.from(revalidatedSlugs);
        const paths = slugList.map((slug) => `/games/${slug}`);
        logger.info(`[DealsWorker] Revalidating ${paths.length} game page(s) in one batch call`);
        // Single POST with all paths — replaces N individual HTTP calls.
        await triggerFrontendRevalidationBatch(paths);
        logger.info(
          `[DealsWorker] ISR revalidation triggered for ${revalidatedSlugs.size} game(s)`
        );
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
});

dealsWorker.on("completed", (job) => {
  logger.info(`[DealsWorker] Job ${job.id} completed`);
});

// ── Exported retention constant so the cleanup worker uses the same value ─────
export { RETENTION_MS };
