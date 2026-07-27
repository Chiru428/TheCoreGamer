import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { cacheGet, cacheSet } from "@/lib/redis";
import { successResponse, errorResponse } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "analytics:performance-scores";
const CACHE_TTL = 3600;

/** GET /api/admin/analytics/performance-scores
 *  score = (viewCount / max(ageDays, 1)) * (1 + commentCount * 0.1 + reactionCount * 0.05)
 */
export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const ae = await requireRole(["ADMIN", "EDITOR"], request);
  if (ae) return ae;

  try {
    try {
      const cached = await cacheGet(CACHE_KEY);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {}

    const articles = await withRetry(() =>
      prisma.article.findMany({
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          publishedAt: true,
          lastMajorUpdateAt: true,
          _count: {
            select: {
              Comment: { where: { status: "APPROVED" } },
              ArticleReaction: true,
            },
          },
        },
      })
    );

    const now = Date.now();
    const scored = articles.map((a) => {
      const viewCount = Number(a.viewCount);
      const publishedAt = a.publishedAt!;
      const ageDays = (now - publishedAt.getTime()) / DAY_MS;
      const score =
        (viewCount / Math.max(ageDays, 1)) *
        (1 + a._count.Comment * 0.1 + a._count.ArticleReaction * 0.05);

      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        viewCount,
        score,
        publishedAt: a.publishedAt,
        daysSincePublished: Math.floor(ageDays),
        lastMajorUpdateAt: a.lastMajorUpdateAt,
        daysSinceUpdate: a.lastMajorUpdateAt
          ? Math.floor((now - a.lastMajorUpdateAt.getTime()) / DAY_MS)
          : null,
      };
    });

    const sevenDaysAgo = now - 7 * DAY_MS;
    const fourteenDaysAgo = now - 14 * DAY_MS;
    const ninetyDaysAgo = now - 90 * DAY_MS;
    const sixtyDaysAgo = now - 60 * DAY_MS;

    const trending = scored
      .filter((a) => a.publishedAt!.getTime() >= sevenDaysAgo)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const needsRefresh = scored
      .filter(
        (a) =>
          a.publishedAt!.getTime() < ninetyDaysAgo &&
          a.viewCount > 500 &&
          (a.lastMajorUpdateAt === null || a.lastMajorUpdateAt.getTime() < sixtyDaysAgo)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const underperforming = scored
      .filter((a) => a.publishedAt!.getTime() < fourteenDaysAgo && a.viewCount < 200)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20);

    const result = { trending, needs_refresh: needsRefresh, underperforming };

    try {
      await cacheSet(CACHE_KEY, result, CACHE_TTL);
    } catch {}

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
