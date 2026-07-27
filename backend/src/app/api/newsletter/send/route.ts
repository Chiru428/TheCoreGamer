import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { newsletterSendSchema } from "@/validators";
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

    const { data, error } = await validateBody(request, newsletterSendSchema);
    if (error) return error;

    // Build base filter
    const baseWhere = { confirmed: true, unsubscribedAt: null, status: "ACTIVE" };

    // Add preference-based segmentation if genres or platforms specified
    let subscribers;
    if (data.genres?.length || data.platforms?.length) {
      subscribers = await prisma.newsletterSubscriber.findMany({
        where: baseWhere,
        select: { email: true, preferences: true },
      });
      // Filter client-side against stored preferences JSON
      // preferences field is Json?: { genres: string[], platforms: string[] }
      subscribers = subscribers.filter((sub) => {
        const prefs = sub.preferences as { genres?: string[]; platforms?: string[] } | null;
        if (!prefs) return false;
        const genreMatch =
          !data.genres?.length || data.genres.some((g) => prefs.genres?.includes(g));
        const platformMatch =
          !data.platforms?.length || data.platforms.some((p) => prefs.platforms?.includes(p));
        return genreMatch || platformMatch;
      });
    } else {
      subscribers = await prisma.newsletterSubscriber.findMany({
        where: baseWhere,
        select: { email: true },
      });
    }

    if (subscribers.length === 0) {
      return NextResponse.json(errorResponse("No subscribers to send to"), { status: 400 });
    }

    // Batch in chunks of 100
    const emails = subscribers.map((s) => s.email);
    const chunks: string[][] = [];
    for (let i = 0; i < emails.length; i += 100) {
      chunks.push(emails.slice(i, i + 100));
    }

    const campaignId = `campaign-${Date.now()}`;

    await prisma.newsletterSend.create({
      data: {
        subject: data.subject,
        recipientCount: emails.length,
        hasSponsored: !!data.sponsoredContent,
        sponsorName: data.sponsoredContent?.sponsor,
        campaignId,
        content: data.sponsoredContent ? { sponsoredContent: data.sponsoredContent } : undefined,
      },
    });

    for (let i = 0; i < chunks.length; i++) {
      await addNewsletterJob({
        campaignId,
        subject: data.subject,
        htmlContent: data.htmlContent,
        subscriberEmails: chunks[i],
        batchIndex: i,
        sponsoredContent: data.sponsoredContent,
      });
    }

    return NextResponse.json(
      successResponse(
        { campaignId, totalSubscribers: emails.length, batches: chunks.length },
        "Newsletter queued for sending"
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
