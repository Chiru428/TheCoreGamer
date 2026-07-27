import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;

  const { session, error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

  if (!["ADMIN", "EDITOR"].includes(session.user.role) && session.user.id !== id) {
    return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
  }

  try {
    const author = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
    if (!author) return NextResponse.json(errorResponse("Author not found"), { status: 404 });

    const articles = await withRetry(() =>
      prisma.article.findMany({
        where: { authorId: id, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          contentType: true,
          viewCount: true,
          publishedAt: true,
          _count: { select: { Comment: { where: { status: "APPROVED" } } } },
        },
        orderBy: { viewCount: "desc" },
      })
    );

    const articleIds = articles.map((a) => a.id);
    const totalViews = articles.reduce((sum, a) => sum + Number(a.viewCount), 0);
    const articleCount = articles.length;
    const avgViewsPerArticle = articleCount > 0 ? totalViews / articleCount : 0;
    const totalComments = articles.reduce((sum, a) => sum + a._count.Comment, 0);
    const commentEngagementRate = totalViews > 0 ? totalComments / totalViews : 0;

    const topArticles = articles.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      contentType: a.contentType,
      viewCount: Number(a.viewCount),
      publishedAt: a.publishedAt,
    }));

    // Monthly view trend (last 6 months) and "views this month", derived from
    // RecentlyViewed — the only timestamped per-article view event we store.
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - i);
      monthKeys.push(d.toISOString().slice(0, 7));
    }
    const sixMonthsAgo = new Date(`${monthKeys[0]}-01T00:00:00.000Z`);

    const recentViews = articleIds.length
      ? await prisma.recentlyViewed.findMany({
          where: { articleId: { in: articleIds }, viewedAt: { gte: sixMonthsAgo } },
          select: { viewedAt: true },
        })
      : [];

    const monthlyTrend = monthKeys.map((month) => ({ month, views: 0 }));
    for (const rv of recentViews) {
      const key = rv.viewedAt.toISOString().slice(0, 7);
      const bucket = monthlyTrend.find((m) => m.month === key);
      if (bucket) bucket.views++;
    }
    const viewsThisMonth = monthlyTrend[monthlyTrend.length - 1].views;

    // Review stats
    const reviews = await prisma.gameReview.findMany({
      where: { Article: { authorId: id, status: "PUBLISHED" } },
      select: { reviewScore: true },
    });
    const reviewCount = reviews.length;
    const avgReviewScore =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + Number(r.reviewScore), 0) / reviewCount
        : null;

    // Site-wide comparison stats
    const siteAgg = await prisma.article.aggregate({
      where: { status: "PUBLISHED" },
      _sum: { viewCount: true },
      _count: { _all: true },
    });
    const siteAverageViews =
      siteAgg._count._all > 0 ? Number(siteAgg._sum.viewCount ?? 0) / siteAgg._count._all : 0;

    const authorTotals = await prisma.article.groupBy({
      by: ["authorId"],
      where: { status: "PUBLISHED" },
      _sum: { viewCount: true },
    });
    const totals = authorTotals.map((a) => Number(a._sum.viewCount ?? 0)).sort((a, b) => a - b);
    const below = totals.filter((t) => t < totalViews).length;
    const percentileRank = totals.length > 0 ? Math.round((below / totals.length) * 100) : 0;

    return NextResponse.json(
      successResponse({
        author,
        totalViews,
        viewsThisMonth,
        articleCount,
        avgViewsPerArticle,
        totalComments,
        commentEngagementRate,
        topArticles,
        reviewCount,
        avgReviewScore,
        siteAverageViews,
        percentileRank,
        monthlyTrend,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
