import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { addNewsletterJob } from "@/lib/bullmq";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const body = await request.json().catch(() => ({}));
    const sendImmediately = body.send === true;

    // Get top 5 articles from past 7 days by views
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topArticles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: sevenDaysAgo } },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { title: true, slug: true, excerpt: true, viewCount: true, contentType: true },
    });

    if (topArticles.length === 0) {
      return NextResponse.json(errorResponse("No articles from the past week"), { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const htmlContent = `
      <h1>🎮 TheCoreGamer Weekly Roundup</h1>
      <p>Here are the top stories from the past week:</p>
      ${topArticles
        .map(
          (a, i) => `
        <div style="margin: 16px 0; padding: 16px; background: #f3f4f6; border-radius: 8px;">
          <h3>${i + 1}. <a href="${siteUrl}/posts/${a.slug}">${a.title}</a></h3>
          <p style="color: #6b7280;">${a.excerpt || ""}</p>
          <span style="color: #9ca3af; font-size: 12px;">${a.contentType} • ${a.viewCount.toString()} views</span>
        </div>
      `
        )
        .join("")}
      <p style="text-align: center; margin-top: 24px;">
        <a href="${siteUrl}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visit TheCoreGamer</a>
      </p>
    `;

    if (!sendImmediately) {
      return NextResponse.json(
        successResponse({ preview: htmlContent, articles: topArticles }, "Preview generated")
      );
    }

    // Send
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { confirmed: true, unsubscribedAt: null },
      select: { email: true },
    });
    const emails = subscribers.map((s) => s.email);
    const chunks: string[][] = [];
    for (let i = 0; i < emails.length; i += 100) chunks.push(emails.slice(i, i + 100));

    const campaignId = `weekly-${Date.now()}`;

    await prisma.newsletterSend.create({
      data: {
        subject: "🎮 TheCoreGamer Weekly Roundup",
        recipientCount: emails.length,
        campaignId,
      },
    });

    for (let i = 0; i < chunks.length; i++) {
      await addNewsletterJob({
        campaignId,
        subject: "🎮 TheCoreGamer Weekly Roundup",
        htmlContent,
        subscriberEmails: chunks[i],
        batchIndex: i,
      });
    }

    return NextResponse.json(
      successResponse({ campaignId, total: emails.length }, "Weekly roundup queued")
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
