import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

    const rawBody = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    };

    let event: {
      type: string;
      data: { email_id: string; email?: { to?: string[] }; tags?: { name: string; value: string }[] };
    };
    try {
      const wh = new Webhook(secret);
      event = wh.verify(rawBody, headers) as any;
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.type === "email.opened" || event.type === "email.clicked") {
      const campaignId = event.data?.tags?.find((t) => t.name === "campaignId")?.value;
      if (campaignId) {
        const field = event.type === "email.opened" ? "openCount" : "clickCount";
        await prisma.newsletterSend.updateMany({
          where: { campaignId },
          data: { [field]: { increment: 1 } },
        });
        logger.info({ campaignId, type: event.type }, "[ResendWebhook] Incremented newsletter send stat");
      }
      return NextResponse.json({ received: true });
    }

    const email = event.data?.email?.to?.[0];
    if (!email) return NextResponse.json({ received: true });

    if (event.type === "email.bounced") {
      await prisma.newsletterSubscriber.updateMany({
        where: { email },
        data: { status: "BOUNCED", unsubscribedAt: new Date() },
      });
      logger.info({ email }, "[ResendWebhook] Marked as BOUNCED");
    } else if (event.type === "email.complained") {
      await prisma.newsletterSubscriber.updateMany({
        where: { email },
        data: { status: "COMPLAINED", unsubscribedAt: new Date() },
      });
      logger.info({ email }, "[ResendWebhook] Marked as COMPLAINED");
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
