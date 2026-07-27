import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/middleware/rateLimit";
import { redis } from "@/lib/redis";
import { successResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** POST /api/posts/[slug]/view — increment view count once per IP per article per 24h */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError;

    try {
      const rateLimitResponse = await rateLimit(request, "READ");
      if (rateLimitResponse) return rateLimitResponse;
    } catch {
      // Redis down — skip rate limiting, allow view ping through
    }

    const { slug } = await params;
    const ip = getClientIp(request);

    // Live activity tracking for the admin "live right now" widget
    try {
      const liveKey = `realtime:${slug}`;
      await redis.zadd(liveKey, { score: Date.now(), member: `${ip}:${Date.now()}` });
      await redis.expire(liveKey, 300);
    } catch {
      // Best-effort — live tracking should never block the view ping
    }

    // Fire-and-forget DB increment and RecentlyViewed logic
    const article = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (article) {
      try {
        const { auth } = await import("@/lib/auth");
        const session = await auth();
        if (session?.user?.id) {
          const userId = session.user.id;
          const articleId = article.id;
          // Upsert silently — never fail the request for this
          prisma.recentlyViewed
            .upsert({
              where: { userId_articleId: { userId, articleId } },
              update: { viewedAt: new Date() },
              create: { userId, articleId },
            })
            .then(() => {
              // Keep only last 50 per user
              return prisma.recentlyViewed
                .findMany({
                  where: { userId },
                  orderBy: { viewedAt: "desc" },
                  skip: 50,
                  select: { id: true },
                })
                .then((old) => {
                  if (old.length)
                    return prisma.recentlyViewed.deleteMany({
                      where: { id: { in: old.map((r) => r.id) } },
                    });
                });
            })
            .catch(() => {});
        }
      } catch {}

      // Deduplicate: one view per IP per article per 24 hours for the PUBLIC counter
      const dedupeKey = `view:${slug}:${ip}`;
      try {
        const already = await redis.get(dedupeKey);
        if (!already) {
          await redis.set(dedupeKey, "1", { ex: 86400 });
          prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE id = ${article.id}`
            .catch(() => {});
          // Track daily aggregate for the analytics chart
          const today = new Date().toISOString().slice(0, 10);
          const dailyKey = `analytics:pageviews:${today}`;
          redis.incr(dailyKey).then(() => redis.expire(dailyKey, 90 * 24 * 60 * 60)).catch(() => {});
        }
      } catch {
        // If Redis fails, increment anyway (no deduplication, but view is counted)
        prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE id = ${article.id}`
          .catch(() => {});
      }
    }

    return NextResponse.json(successResponse(null));
  } catch (err) {
    console.error("[view POST] Unhandled error:", err);
    // View tracking is non-critical — return 200 so the frontend doesn't log errors
    return NextResponse.json(successResponse(null));
  }
}
