import { Queue, Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { connection, isConnectionError } from "../lib/bullmq";
import { captureError } from "../lib/sentry";
import { syncArticleToAlgolia } from "./algolia.worker";
import { purgeArticle } from "../lib/cloudflare";
import { revalidateArticlePaths } from "../lib/revalidate";

export const articleCronQueue = new Queue("article-cron", { connection });

// Add a repeatable job that runs every minute
articleCronQueue.add("publish-scheduled-articles", {}, { repeat: { pattern: "* * * * *" } });

export const articleWorker = new Worker(
  "article-cron",
  async (job) => {
    if (job.name === "publish-scheduled-articles") {
      // 1. Scheduled Publishing: DRAFT/APPROVED -> PUBLISHED if scheduledAt <= NOW
      const now = new Date();

      const articlesToPublish = await prisma.article.findMany({
        where: {
          status: { in: ["DRAFT", "APPROVED"] },
          scheduledAt: { lte: now },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          contentType: true,
          originallyPublishedAt: true,
          authorId: true,
        },
      });

      if (articlesToPublish.length > 0) {
        // originallyPublishedAt is immutable — set only on an article's first-ever publish,
        // never overwritten on republish, so first-timers and republishes are updated separately
        const firstTimeIds = articlesToPublish
          .filter((a) => !a.originallyPublishedAt)
          .map((a) => a.id);
        const republishIds = articlesToPublish
          .filter((a) => a.originallyPublishedAt)
          .map((a) => a.id);

        if (firstTimeIds.length > 0) {
          await prisma.article.updateMany({
            where: { id: { in: firstTimeIds } },
            data: {
              status: "PUBLISHED",
              publishedAt: now,
              originallyPublishedAt: now,
              scheduledAt: null, // clear scheduled date once published
            },
          });
        }

        if (republishIds.length > 0) {
          await prisma.article.updateMany({
            where: { id: { in: republishIds } },
            data: {
              status: "PUBLISHED",
              publishedAt: now,
              scheduledAt: null, // clear scheduled date once published
            },
          });
        }

        await Promise.all(articlesToPublish.map((a) => syncArticleToAlgolia(a.id)));
        await Promise.all(articlesToPublish.map((a) => purgeArticle(a.slug, a.contentType)));

        // Trigger frontend ISR revalidation for each published article —
        // uses the shared, content-type-aware helper so e.g. a WALKTHROUGH
        // correctly revalidates /walkthroughs, not just /articles.
        await Promise.all(
          articlesToPublish.map((a) => revalidateArticlePaths(a.slug, a.contentType))
        );

        console.log(`[ARTICLE WORKER] Published ${articlesToPublish.length} scheduled articles.`);
      }

      // 2. Embargo Management: If embargo is passed, clear it.
      const embargoesToLift = await prisma.article.findMany({
        where: {
          embargoUntil: { lte: now },
        },
        select: { id: true },
      });

      if (embargoesToLift.length > 0) {
        await prisma.article.updateMany({
          where: { id: { in: embargoesToLift.map((a) => a.id) } },
          data: { embargoUntil: null },
        });

        console.log(`[ARTICLE WORKER] Lifted embargo on ${embargoesToLift.length} articles.`);
      }
    }
  },
  { connection }
);

articleWorker.on("failed", (job, err) => {
  console.error(`Article cron job failed:`, err);
  captureError(err);
});

articleWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  console.error(`[ArticleWorker] Worker connection error:`, err);
  captureError(err);
});

console.log("✅ Article cron worker initialized.");
