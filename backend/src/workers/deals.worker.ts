import { Worker, type Job, connection, isConnectionError, dealsQueue } from "@/lib/bullmq";
import type { DealsJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { resolveItadId, getPrices, type PriceResult } from "@/lib/itad";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { triggerFrontendRevalidationBatch } from "@/lib/revalidate";

// ── Shop selection config ─────────────────────────────────────────────────────
// Maximum number of shop price records to keep per game per poll.
const MAX_SHOPS = 5;

// Priority stores (India-relevant, globally accessible). These are always
// picked first. Remaining slots (up to MAX_SHOPS) are filled with the
// best-discount deals from any other store ITAD returns.
const PREFERRED_SHOPS = [
  "Steam",
  "Epic Games Store",
  "GOG",
  "Humble Store",
  "Microsoft Store",
];

/**
 * For a single game's price list, select up to MAX_SHOPS entries:
 *   1. Include all PREFERRED_SHOPS that have a price (in priority order).
 *   2. Fill remaining slots from other shops sorted by highest discount %,
 *      then lowest price — so users always see the best available deal.
 */
function selectTopShopsForGame(prices: PriceResult[]): PriceResult[] {
  const preferred: PriceResult[] = [];
  const others: PriceResult[] = [];

  for (const p of prices) {
    if (PREFERRED_SHOPS.includes(p.shop)) {
      preferred.push(p);
    } else {
      others.push(p);
    }
  }

  // Sort preferred in the declared priority order
  preferred.sort(
    (a, b) => PREFERRED_SHOPS.indexOf(a.shop) - PREFERRED_SHOPS.indexOf(b.shop)
  );

  // Fill remaining slots from other shops: highest discount first, then lowest price
  const slotsLeft = MAX_SHOPS - preferred.length;
  if (slotsLeft > 0) {
    others.sort((a, b) => b.cut - a.cut || a.price - b.price);
    preferred.push(...others.slice(0, slotsLeft));
  }

  return preferred;
}

/**
 * Groups a flat ITAD price list by itadGameId, applies selectTopShopsForGame
 * to each group, and returns the flattened result.
 */
function filterPricesToTopShops(prices: PriceResult[]): PriceResult[] {
  const byGame = new Map<string, PriceResult[]>();
  for (const p of prices) {
    const list = byGame.get(p.gameId) ?? [];
    list.push(p);
    byGame.set(p.gameId, list);
  }

  const filtered: PriceResult[] = [];
  for (const gamePrices of byGame.values()) {
    filtered.push(...selectTopShopsForGame(gamePrices));
  }
  return filtered;
}

const BATCH_SIZE = 50;

// Rolling window: keep exactly the last 5 days (today inclusive) of snapshots.
// Anything older than 120 hours from now is deleted.
const RETENTION_MS = 5 * 24 * 60 * 60 * 1000; // 120 hours

export function startDealsWorker() {
  // ── Self-healing: remove any stale repeatable schedules from previous deploys ──
  // The old "deals-poll-hourly" (every hour) was replaced by "deals-poll-every-12h".
  // Running removeRepeatableByKey on startup ensures the old schedule is gone
  // even if a manual cleanup script couldn't connect to Redis from outside Render.
  dealsQueue.getRepeatableJobs().then(async (jobs) => {
    for (const job of jobs) {
      if (job.id === "deals-poll-hourly" || job.id === "deals-poll-every-6h") {
        await dealsQueue.removeRepeatableByKey(job.key);
        logger.info(`[DealsWorker] Removed stale repeatable job: "${job.id}" (${job.pattern})`);
      }
    }
  }).catch((err) => {
    if (!isConnectionError(err)) {
      logger.warn({ err }, "[DealsWorker] Failed to clean up stale repeatable jobs");
    }
  });

  // Register the new 12-hour schedule
  dealsQueue.add(
    "poll-prices",
    { trigger: "poll" },
    {
      // Every 12 hours — all major stores run sales for at least 24 h, so
      // twice-daily polling catches every meaningful price change while
      // reducing bandwidth by 87.5% vs the old hourly schedule.
      repeat: { pattern: "0 */12 * * *" },
      jobId: "deals-poll-every-12h",
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
        const rawPrices = await getPrices(itadIds);

        // ── 3a. Filter: keep at most MAX_SHOPS (5) per game ────────────────
        // Priority: PREFERRED_SHOPS first, then best-discount fallbacks.
        const prices = filterPricesToTopShops(rawPrices);
        if (rawPrices.length !== prices.length) {
          logger.debug(
            `[DealsWorker] Shop filter: ${rawPrices.length} → ${prices.length} price entries (kept top ${MAX_SHOPS}/game)`
          );
        }

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

          // Window matches the poll interval (12 h) — no need to look back 24 h
          // since we poll every 12 h and only write on price change anyway.
          const recentSnapshots = await prisma.priceSnapshot.findMany({
            where: {
              gameId: { in: gameIds },
              recordedAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
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
