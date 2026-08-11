/**
 * cleanup.worker.ts
 *
 * Runs independently of price-fetching every day at 2 AM.
 * Deletes PriceSnapshot rows older than 5 days (today inclusive = 120 hours)
 * using chunked raw SQL to avoid row-lock timeouts on large deletes.
 *
 * Keeping this separate from deals.worker guarantees cleanup always runs even
 * if the price-poll job crashes, times out, or is temporarily disabled.
 */

import { Worker, type Job, connection, isConnectionError, cleanupQueue } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { RETENTION_MS } from "./deals.worker";

// Delete in chunks of this size to avoid a single massive DELETE that locks
// the table for too long and affects live price reads.
const DELETE_CHUNK_SIZE = 5_000;

export interface CleanupJobData {
  trigger: "scheduled" | "manual";
}

export function startCleanupWorker() {
  // Schedule once a day at 2 AM UTC — independent of price-fetching
  cleanupQueue
    .add(
      "cleanup-price-snapshots",
      { trigger: "scheduled" },
      {
        repeat: { pattern: "0 2 * * *" },
        jobId: "cleanup-price-snapshots-daily",
      }
    )
    .catch((err) => {
      if (!isConnectionError(err)) {
        logger.error({ err }, "[CleanupWorker] Failed to schedule repeatable job");
      }
    });

  return cleanupWorker;
}

export const cleanupWorker = new Worker<CleanupJobData>(
  "cleanup",
  async (_job: Job<CleanupJobData>) => {
    try {
      // Rolling 5-day cutoff: anything recorded before this timestamp is deleted.
      // Using Date.now() - 120h ensures "5 days inclusive of today" regardless
      // of UTC midnight boundaries or the time this job runs.
      const cutoff = new Date(Date.now() - RETENTION_MS);

      logger.info(
        { cutoff },
        `[CleanupWorker] Starting PriceSnapshot cleanup — deleting rows older than ${cutoff.toISOString()}`
      );

      let totalDeleted = 0;

      // Chunked delete loop: keeps individual transactions small so we don't
      // hold row-locks for the entire table during cleanup.
      while (true) {
        // Find the IDs of the next chunk to delete
        const rowsToDelete = await prisma.priceSnapshot.findMany({
          where: { recordedAt: { lt: cutoff } },
          select: { id: true },
          take: DELETE_CHUNK_SIZE,
        });

        if (rowsToDelete.length === 0) break;

        const ids = rowsToDelete.map((r) => r.id);
        const { count } = await prisma.priceSnapshot.deleteMany({
          where: { id: { in: ids } },
        });

        totalDeleted += count;
        logger.info(`[CleanupWorker] Deleted chunk of ${count} rows (total so far: ${totalDeleted})`);

        // Small pause between chunks to avoid overwhelming the DB connection pool
        if (rowsToDelete.length === DELETE_CHUNK_SIZE) {
          await new Promise((r) => setTimeout(r, 200));
        } else {
          break; // last chunk — we're done
        }
      }

      logger.info(`[CleanupWorker] Done — removed ${totalDeleted} stale PriceSnapshot rows`);
    } catch (err) {
      captureError(err);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

cleanupWorker.on("failed", (job, err) => {
  logger.error({ err }, `[CleanupWorker] Job ${job?.id} failed`);
  captureError(err);
});

cleanupWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[CleanupWorker] Worker connection error");
});

cleanupWorker.on("completed", (job) => {
  logger.info(`[CleanupWorker] Job ${job.id} completed`);
});
