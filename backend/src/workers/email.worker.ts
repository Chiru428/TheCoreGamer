import { Worker, type Job, connection, isConnectionError } from "@/lib/bullmq";
import type { EmailJobData } from "@/lib/bullmq";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendArticleApprovalEmail,
  sendArticleRejectionEmail,
  sendEditorNotificationEmail,
  sendNewsletterConfirmationEmail,
  sendNewDeviceAlertEmail,
  sendAccountDeletedEmail,
} from "@/lib/resend";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { captureError } from "@/lib/sentry";

export const emailWorker = new Worker(
  "email",
  async (job: Job<EmailJobData>) => {
    const { type, to, data } = job.data;

    switch (type) {
      case "verification":
        await sendVerificationEmail(to as string, data.token as string, data.displayName as string);
        break;
      case "welcome":
        await sendWelcomeEmail(to as string, data.displayName as string);
        break;
      case "reset":
        await sendPasswordResetEmail(to as string, data.token as string);
        break;
      case "approval":
        await sendArticleApprovalEmail(
          to as string,
          data.displayName as string,
          data.articleTitle as string,
          data.articleSlug as string
        );
        {
          const u = await prisma.user.findUnique({
            where: { email: to as string },
            select: { id: true },
          });
          if (u)
            await createNotification(
              u.id,
              "article_approved",
              "Article Approved",
              `"${data.articleTitle as string}" has been approved and is now live`,
              `/articles/${data.articleSlug as string}`
            );
        }
        break;
      case "rejection":
        await sendArticleRejectionEmail(
          to as string,
          data.displayName as string,
          data.articleTitle as string,
          data.reason as string
        );
        break;
      case "editor-notification":
        await sendEditorNotificationEmail(
          to as string[],
          data.articleTitle as string,
          data.authorName as string
        );
        break;
      case "newsletter-confirm":
        await sendNewsletterConfirmationEmail(to as string, data.token as string);
        break;
      case "new-device-alert":
        await sendNewDeviceAlertEmail(to as string, {
          displayName: data.displayName as string,
          browser: data.browser as string,
          os: data.os as string,
          ipAddress: data.ipAddress as string,
          loginAt: data.loginAt as string,
        });
        break;
      case "account-deleted":
        await sendAccountDeletedEmail(to as string, data.displayName as string);
        break;
      default:
        logger.warn(`Unknown email job type: ${type}`);
    }

    logger.info(
      `[EmailWorker] Processed ${type} email to ${Array.isArray(to) ? to.length + " recipients" : to}`
    );
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }, // 10 emails/sec
  }
);

emailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, "[EmailWorker] Job failed");
  captureError(err instanceof Error ? err : new Error(String(err)));
});

emailWorker.on("error", (err) => {
  // ECONNRESET = Upstash idle-connection reset; ioredis reconnects automatically.
  if (isConnectionError(err)) return;
  logger.error({ err }, "[EmailWorker] Worker connection error");
  captureError(err);
});

emailWorker.on("completed", (job) => {
  logger.info(`[EmailWorker] Job ${job.id} completed`);
});
