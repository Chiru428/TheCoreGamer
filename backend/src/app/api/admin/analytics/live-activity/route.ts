import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

const LIVE_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const ae = await requireRole(["ADMIN", "EDITOR"], request);
  if (ae) return ae;

  try {
    const keys = await redis.keys("realtime:*");
    const cutoff = Date.now() - LIVE_WINDOW_MS;

    const counts = await Promise.all(
      keys.map(async (key) => {
        await redis.zremrangebyscore(key, 0, cutoff);
        const activeCount = await redis.zcard(key);
        return { slug: key.slice("realtime:".length), activeCount };
      })
    );

    const active = counts.filter((c) => c.activeCount > 0);

    const articles = active.length
      ? await prisma.article.findMany({
          where: { slug: { in: active.map((c) => c.slug) } },
          select: { slug: true, title: true },
        })
      : [];
    const titleBySlug = new Map(articles.map((a) => [a.slug, a.title]));

    const pages = active
      .map((c) => ({
        slug: c.slug,
        title: titleBySlug.get(c.slug) ?? c.slug,
        activeCount: c.activeCount,
      }))
      .sort((a, b) => b.activeCount - a.activeCount);

    return NextResponse.json(successResponse({ pages }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
