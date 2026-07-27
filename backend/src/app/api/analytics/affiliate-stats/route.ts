import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [clicksByStore, topArticleGroups, totalClicks] = await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ["store"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.affiliateClick.groupBy({
        by: ["articleId"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          articleId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.affiliateClick.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Enrich top article groups with title + slug
    const articleIds = topArticleGroups
      .map((r) => r.articleId)
      .filter((id): id is string => id !== null);

    const articles = articleIds.length
      ? await prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: { id: true, title: true, slug: true, contentType: true },
        })
      : [];

    const articleMap = Object.fromEntries(articles.map((a) => [a.id, a]));

    return NextResponse.json(
      successResponse({
        periodDays: 30,
        totalClicks,
        clicksByStore: clicksByStore.map((r) => ({
          store: r.store,
          clicks: r._count.id,
        })),
        topArticles: topArticleGroups.map((r) => ({
          articleId: r.articleId,
          clicks: r._count.id,
          article: r.articleId ? (articleMap[r.articleId] ?? null) : null,
        })),
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
