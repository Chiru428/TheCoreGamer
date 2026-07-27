import { Worker, type Job, connection, isConnectionError } from "@/lib/bullmq";
import type { SearchIndexJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";
import { syncArticleToAlgolia, deleteArticleFromAlgolia } from "./algolia.worker";

export const searchIndexWorker = new Worker(
  "searchIndex",
  async (job: Job<SearchIndexJobData>) => {
    const { articleId, action } = job.data;

    if (action === "index") {
      // Update tsvector for full-text search
      // Using raw SQL since Prisma doesn't natively support tsvector updates
      await prisma.$executeRawUnsafe(
        `
        UPDATE "Article" SET "searchVector" =
          setweight(to_tsvector('english', COALESCE("title", '')), 'A') ||
          setweight(to_tsvector('english', COALESCE("excerpt", '')), 'B') ||
          setweight(to_tsvector('english', COALESCE((
            SELECT string_agg("transcript", ' ')
            FROM "VideoAsset"
            WHERE "articleId" = "Article"."id" AND "transcript" IS NOT NULL
          ), '')), 'D')
        WHERE "id" = $1
      `,
        articleId
      );

      logger.info(`[SearchIndexWorker] Indexed article ${articleId}`);
      await syncArticleToAlgolia(articleId);
    } else if (action === "remove") {
      await prisma.$executeRawUnsafe(
        `
        UPDATE "Article" SET "searchVector" = NULL WHERE "id" = $1
      `,
        articleId
      );

      logger.info(`[SearchIndexWorker] Removed index for article ${articleId}`);
      await deleteArticleFromAlgolia(articleId);
    }
  },
  { connection, concurrency: 3 }
);

searchIndexWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, "[SearchIndexWorker] Job failed");
  captureError(err instanceof Error ? err : new Error(String(err)));
});

searchIndexWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[SearchIndexWorker] Worker connection error");
  captureError(err);
});
