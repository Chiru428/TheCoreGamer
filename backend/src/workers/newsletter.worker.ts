import { Worker, type Job, connection, isConnectionError } from "@/lib/bullmq";
import type { NewsletterJobData, NewsletterSponsoredContent } from "@/lib/bullmq";
import { resend } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { captureError } from "@/lib/sentry";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "TheCoreGamer <noreply@thecoregamer.com>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSponsoredSection(sponsored: NewsletterSponsoredContent): string {
  const { sponsor, headline, body, ctaText, ctaUrl, imageUrl } = sponsored;
  return `
    <div style="border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 24px 0; background: #fffbeb;">
      <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-variant: small-caps; letter-spacing: 0.08em; color: #b45309;">
        Sponsored by ${escapeHtml(sponsor)}
      </p>
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(headline)}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px;" />` : ""}
      <h3 style="margin: 0 0 8px; font-size: 18px; color: #111827;">${escapeHtml(headline)}</h3>
      <p style="margin: 0 0 14px; color: #4b5563;">${escapeHtml(body)}</p>
      <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">${escapeHtml(ctaText)}</a>
    </div>
  `;
}

export const newsletterWorker = new Worker(
  "newsletter",
  async (job: Job<NewsletterJobData>) => {
    const { campaignId, subject, htmlContent, subscriberEmails, batchIndex, sponsoredContent } = job.data;

    logger.info(
      `[NewsletterWorker] Processing batch ${batchIndex} of campaign ${campaignId} (${subscriberEmails.length} emails)`
    );

    const finalHtml = sponsoredContent ? `${htmlContent}${renderSponsoredSection(sponsoredContent)}` : htmlContent;

    // Send in smaller sub-batches to respect Resend rate limits
    const subBatchSize = 10;
    for (let i = 0; i < subscriberEmails.length; i += subBatchSize) {
      const batch = subscriberEmails.slice(i, i + subBatchSize);

      await Promise.allSettled(
        batch.map((email) =>
          resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: finalHtml,
            tags: [{ name: "campaignId", value: campaignId }],
          })
        )
      );

      // Small delay between sub-batches
      if (i + subBatchSize < subscriberEmails.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logger.info(`[NewsletterWorker] Batch ${batchIndex} complete`);
  },
  {
    connection,
    concurrency: 2,
    limiter: { max: 5, duration: 1000 },
  }
);

newsletterWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, "[NewsletterWorker] Job failed");
  captureError(err instanceof Error ? err : new Error(String(err)));
});

newsletterWorker.on("error", (err) => {
  if (isConnectionError(err)) return;
  logger.error({ err }, "[NewsletterWorker] Worker connection error");
  captureError(err);
});
