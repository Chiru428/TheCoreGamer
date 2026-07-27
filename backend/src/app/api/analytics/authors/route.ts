import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { cacheGet, cacheSet } from "@/lib/redis";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  const authError = await requireRole(["ADMIN", "EDITOR"], request);
  if (authError) return authError;

  try {
    const cacheKey = "analytics:authors:30d";
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {}

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        User_Article_authorIdToUser: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { Comment: true } },
      },
    });

    // Group by author
    const authorMap = new Map<
      string,
      {
        authorId: string;
        displayName: string;
        avatarUrl: string | null;
        articleCount: number;
        totalViews: number;
        totalComments: number;
        topArticle: { title: string; slug: string; views: number } | null;
      }
    >();

    for (const article of articles) {
      const author = article.User_Article_authorIdToUser;
      if (!author) continue;
      const views = Number(article.viewCount ?? 0);
      const existing = authorMap.get(author.id);
      if (!existing) {
        authorMap.set(author.id, {
          authorId: author.id,
          displayName: author.displayName ?? "",
          avatarUrl: author.avatarUrl ?? null,
          articleCount: 1,
          totalViews: views,
          totalComments: article._count.Comment,
          topArticle: { title: article.title, slug: article.slug, views },
        });
      } else {
        existing.articleCount++;
        existing.totalViews += views;
        existing.totalComments += article._count.Comment;
        if (views > (existing.topArticle?.views ?? 0)) {
          existing.topArticle = { title: article.title, slug: article.slug, views };
        }
      }
    }

    const result = Array.from(authorMap.values())
      .map((a) => ({ ...a, avgViewsPerArticle: Math.round(a.totalViews / a.articleCount) }))
      .sort((a, b) => b.totalViews - a.totalViews);

    try {
      await cacheSet(cacheKey, result, 3600);
    } catch {}
    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
