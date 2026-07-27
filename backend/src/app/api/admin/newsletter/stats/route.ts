import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const roleCheck = await requireRole(["ADMIN"], request);
  if (roleCheck) return roleCheck;

  try {
    const sends = await prisma.newsletterSend.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    const history = sends.map((s) => ({
      id: s.id,
      subject: s.subject,
      sentAt: s.sentAt,
      recipientCount: s.recipientCount,
      openCount: s.openCount,
      clickCount: s.clickCount,
      hasSponsored: s.hasSponsored,
      sponsorName: s.sponsorName,
      openRate: s.recipientCount > 0 ? s.openCount / s.recipientCount : 0,
      clickRate: s.recipientCount > 0 ? s.clickCount / s.recipientCount : 0,
    }));

    // ── Subscriber growth over the last 30 days ─────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const [recentSubscribers, baseCount] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where: { subscribedAt: { gte: windowStart } },
        select: { subscribedAt: true },
      }),
      prisma.newsletterSubscriber.count({
        where: { subscribedAt: { lt: windowStart } },
      }),
    ]);

    const dayMap = new Map<string, number>();
    for (const sub of recentSubscribers) {
      const day = sub.subscribedAt.toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    const subscriberGrowth: { date: string; newSubscribers: number; total: number }[] = [];
    let cumulative = baseCount;
    for (let i = 0; i < 30; i++) {
      const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const newSubscribers = dayMap.get(key) ?? 0;
      cumulative += newSubscribers;
      subscriberGrowth.push({ date: key, newSubscribers, total: cumulative });
    }

    return NextResponse.json(successResponse({ history, subscriberGrowth }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
