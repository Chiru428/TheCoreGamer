import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { renderVerificationEmail } from "@/emails/verification";
import { renderResetPasswordEmail } from "@/emails/reset-password";
import { renderWelcomeEmail } from "@/emails/welcome";
import { renderArticleApprovedEmail } from "@/emails/article-approved";
import { renderArticleRejectedEmail } from "@/emails/article-rejected";
import { renderEditorNotificationEmail } from "@/emails/editor-notification";
import { renderNewsletterConfirmEmail } from "@/emails/newsletter-confirm";
import { renderNewDeviceAlertEmail } from "@/emails/new-device-alert";
import { renderAccountDeletedEmail } from "@/emails/account-deleted";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

export const resend = globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY || "re_placeholder_build_only");

if (process.env.NODE_ENV !== "production") {
  globalForResend.resend = resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "TheCoreGamer <noreply@thecoregamer.com>";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string, displayName: string) {
  const html = await renderVerificationEmail(
    displayName,
    `${SITE_URL}/auth/verify-email?token=${token}`
  );
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your TheCoreGamer account",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const html = await renderResetPasswordEmail(`${SITE_URL}/auth/reset-password?token=${token}`);
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your TheCoreGamer password",
    html,
  });
}

export async function sendWelcomeEmail(email: string, displayName: string) {
  const html = await renderWelcomeEmail(displayName, SITE_URL);
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to TheCoreGamer!",
    html,
  });
}

export async function sendArticleApprovalEmail(
  email: string,
  displayName: string,
  articleTitle: string,
  articleSlug: string
) {
  const html = await renderArticleApprovedEmail(
    displayName,
    articleTitle,
    `${SITE_URL}/posts/${articleSlug}`
  );
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your article "${articleTitle}" has been approved!`,
    html,
  });
}

export async function sendArticleRejectionEmail(
  email: string,
  displayName: string,
  articleTitle: string,
  reason: string
) {
  const html = await renderArticleRejectedEmail(
    displayName,
    articleTitle,
    reason,
    `${SITE_URL}/dashboard/articles`
  );
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Update on your article "${articleTitle}"`,
    html,
  });
}

export async function sendEditorNotificationEmail(
  editorEmails: string[],
  articleTitle: string,
  authorName: string
) {
  const html = await renderEditorNotificationEmail(
    articleTitle,
    authorName,
    `${SITE_URL}/admin/articles`
  );
  return resend.emails.send({
    from: FROM_EMAIL,
    to: editorEmails,
    subject: `New article submitted for review: "${articleTitle}"`,
    html,
  });
}

export async function sendNewsletterConfirmationEmail(email: string, token: string) {
  const html = await renderNewsletterConfirmEmail(
    `${SITE_URL}/newsletter/confirm?token=${token}`
  );
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your TheCoreGamer newsletter subscription",
    html,
  });
  if (result.error) {
    logger.error({ error: result.error }, "Resend Error");
    throw new Error(result.error.message);
  }
  return result;
}

export async function sendNewDeviceAlertEmail(
  email: string,
  data: {
    displayName: string;
    browser: string;
    os: string;
    ipAddress: string;
    loginAt: string;
  }
) {
  const html = await renderNewDeviceAlertEmail({
    ...data,
    securityUrl: `${SITE_URL}/settings/security`,
  });
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "New sign-in to your TheCoreGamer account",
    html,
  });
}

export async function sendAccountDeletedEmail(email: string, displayName: string) {
  const html = await renderAccountDeletedEmail({ displayName });
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your TheCoreGamer account has been deleted",
    html,
  });
}

export default resend;
