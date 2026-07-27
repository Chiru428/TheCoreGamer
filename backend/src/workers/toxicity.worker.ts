import { Worker, Job } from "bullmq";
import { connection, isConnectionError } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";

export const toxicityWorker = new Worker(
  "toxicity-check",
  async (job: Job<{ commentId: string; text: string }>) => {
    const { commentId, text } = job.data;

    // If OpenAI API key is not configured, auto-approve the comment
    if (!process.env.OPENAI_API_KEY) {
      logger.warn({ commentId }, "[ToxicityWorker] OPENAI_API_KEY not set — auto-approving");
      await prisma.comment.update({
        where: { id: commentId },
        data: { status: "APPROVED" },
      });
      return;
    }

    try {
      const res = await fetch(OPENAI_MODERATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input: text.slice(0, 2000) }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI Moderation API ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const result = json.results?.[0];

      if (!result) {
        throw new Error("OpenAI Moderation API returned empty results");
      }

      const flagged: boolean = result.flagged === true;

      // Derive a single 0–1 score from the highest category score for logging/threshold tuning
      const categoryScores: Record<string, number> = result.category_scores ?? {};
      const score = Math.max(0, ...Object.values(categoryScores));

      const newStatus = flagged ? "SPAM" : "APPROVED";

      await prisma.comment.update({
        where: { id: commentId },
        data: { status: newStatus },
      });

      logger.info(
        { commentId, flagged, score: score.toFixed(3), newStatus },
        "[ToxicityWorker] Check complete"
      );
    } catch (err) {
      logger.warn({ commentId, err }, "[ToxicityWorker] API error — retrying");
      throw err; // Let BullMQ handle retry
    }
  },
  { connection, concurrency: 5 }
);

toxicityWorker.on("failed", async (job, err) => {
  logger.error({ jobId: job?.id, err }, "[ToxicityWorker] Job failed permanently — auto-approving comment");
  captureError(err instanceof Error ? err : new Error(String(err)));

  // Auto-approve so the comment isn't silently stuck as PENDING forever
  if (job?.data?.commentId) {
    try {
      await prisma.comment.update({
        where: { id: job.data.commentId },
        data: { status: "APPROVED" },
      });
      logger.info({ commentId: job.data.commentId }, "[ToxicityWorker] Auto-approved after exhausted retries");
    } catch (updateErr: any) {
      // Comment was already deleted (e.g. stale/seed data) — not an actionable failure, just skip quietly.
      if (updateErr?.code === "P2025") {
        logger.info({ commentId: job.data.commentId }, "[ToxicityWorker] Comment no longer exists — skipping auto-approve");
      } else {
        logger.error({ commentId: job.data.commentId, updateErr }, "[ToxicityWorker] Failed to auto-approve comment");
      }
    }
  }
});

toxicityWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[ToxicityWorker] Worker connection error");
  captureError(err);
});
