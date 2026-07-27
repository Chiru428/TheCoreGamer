import { Worker, type Job, connection, isConnectionError } from "@/lib/bullmq";
import type { PushJobData } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";

export const pushWorker = new Worker(
  "push",
  async (job: Job<PushJobData>) => {
    const { title, body, url, icon, userIds } = job.data;

    // Targeted pushes go only to the named users' subscriptions; otherwise broadcast
    const subscriptions = await prisma.pushSubscription.findMany({
      where: userIds ? { userId: { in: userIds } } : undefined,
      select: { id: true, endpoint: true, keys: true },
    });

    logger.info(`[PushWorker] Sending to ${subscriptions.length} subscribers`);

    const expiredIds: string[] = [];

    // Batch send
    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (sub) => {
          const keys = sub.keys as { auth: string; p256dh: string };
          const success = await sendPushNotification(
            { endpoint: sub.endpoint, keys },
            { title, body, url, icon }
          );
          if (!success) expiredIds.push(sub.id);
        })
      );
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
      logger.info(`[PushWorker] Removed ${expiredIds.length} expired subscriptions`);
    }

    logger.info(`[PushWorker] Push notification sent`);
  },
  { connection, concurrency: 2 }
);

pushWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, "[PushWorker] Job failed");
  captureError(err instanceof Error ? err : new Error(String(err)));
});

pushWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[PushWorker] Worker connection error");
  captureError(err);
});
