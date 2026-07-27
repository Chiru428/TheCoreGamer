import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import {
  parsePagination,
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

/**
 * GET /api/feed?page=1
 *
 * Personalized article feed based on tag affinity scoring.
 *
 * Algorithm (authenticated):
 *  1. Pull the user's 20 most recent bookmarks → extract tag IDs → build frequency map
 *  2. Pull the user's content preferences (followedGenres, followedPlatforms)
 *  3. Fetch PUBLISHED articles where:
 *     - Tags overlap with top-5 bookmarked tags  OR
 *     - Related game genres overlap with followedGenres  OR
 *     - Related game platforms overlap with followedPlatforms
 *  4. Score each article: tag-match × 5 + featured × 10 + breaking × 5 + recency
 *  5. Sort descending by score, skip/take for pagination
 *
 * Algorithm (anonymous): return trending (high-view) recent articles.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams, 12, 50);

    // Identify user
    let userId: string | null = null;
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch {
      /* intentionally empty */
    }

    // Anonymous fast-path: cached trending feed
    if (!userId) {
      const cacheKey = `feed:anon:p${page}:l${limit}`;
      try {
        const cached = await cacheGet<{ articles: unknown[]; total: number }>(cacheKey);
        if (cached)
          return NextResponse.json(
            successResponse(
              cached.articles,
              undefined,
              buildPaginationMeta(page, limit, cached.total)
            )
          );
      } catch {
        /* intentionally empty */
      }

      // Execute sequentially to avoid starving the 2-connection pool limit
      const articles = await withRetry(() =>
        prisma.article.findMany({
          where: { status: "PUBLISHED" },
          include: {
            User_Article_authorIdToUser: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            ArticleTag: { include: { Tag: true } },
            GameReview: { select: { reviewScore: true } },
          },
          orderBy: [{ featured: "desc" }, { viewCount: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }],
          skip,
          take: limit,
        })
      );

      const total = await withRetry(() => prisma.article.count({ where: { status: "PUBLISHED" } }));

      const serialized = articles.map(serializeArticle);
      try {
        await cacheSet(cacheKey, { articles: serialized, total }, CACHE_TTL.MEDIUM);
      } catch {
        /* intentionally empty */
      }
      return NextResponse.json(
        successResponse(serialized, undefined, buildPaginationMeta(page, limit, total))
      );
    }

    // Authenticated: tag-affinity feed
    const cacheKey = `feed:auth:${userId}:p${page}:l${limit}`;
    try {
      const cached = await cacheGet<{ articles: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json(
          successResponse(
            cached.articles,
            undefined,
            buildPaginationMeta(page, limit, cached.total)
          )
        );
      }
    } catch {
      /* intentionally empty */
    }

    // Avoid Promise.all to prevent connection pool exhaustion during concurrent SWR fetches
    let bookmarks: any[] = [];
    let prefs: any = null;

    await withRetry(async () => {
      bookmarks = await prisma.bookmark.findMany({
        where: { userId },
        include: { Article: { include: { ArticleTag: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      prefs = await prisma.userContentPreference.findUnique({ where: { userId } });
    });

    // Build tag frequency map from bookmarks
    const tagFreq: Record<string, number> = {};
    for (const b of bookmarks) {
      for (const at of b.Article?.ArticleTag ?? []) {
        tagFreq[at.tagId] = (tagFreq[at.tagId] ?? 0) + 1;
      }
    }

    const topTagIds = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    const followedGenres = prefs?.followedGenres ?? [];
    const followedPlatforms = prefs?.followedPlatforms ?? [];

    // Build WHERE: at least one tag match, genre match, or platform match
    const where: Record<string, unknown> = { status: "PUBLISHED" };

    if (topTagIds.length === 0 && followedGenres.length === 0 && followedPlatforms.length === 0) {
      // The user has absolutely no personalization signals.
      // Return empty so the frontend shows the "Start bookmarking..." prompt.
      return NextResponse.json(
        successResponse([], undefined, buildPaginationMeta(page, limit, 0))
      );
    }

    const orClauses: Record<string, unknown>[] = [];
    if (topTagIds.length > 0) {
      orClauses.push({ ArticleTag: { some: { tagId: { in: topTagIds } } } });
    }
    if (followedGenres.length > 0) {
      orClauses.push({
        Game: {
          some: { genres: { hasSome: followedGenres } },
        },
      });
    }
    if (followedPlatforms.length > 0) {
      orClauses.push({
        Game: {
          some: { platforms: { hasSome: followedPlatforms } },
        },
      });
    }
    where.OR = orClauses;

    // Fetch candidates (2× limit to allow scoring + sorting)
    const candidates = await withRetry(() =>
      prisma.article.findMany({
        where,
        include: {
          User_Article_authorIdToUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          ArticleTag: { include: { Tag: true } },
          Game: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
          GameReview: { select: { reviewScore: true } },
        },
        orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
        take: limit * 3 + skip,
      })
    );

    const bookmarkedIds = new Set(bookmarks.map((b) => b.articleId));
    const now = Date.now();

    // Score each candidate based entirely on user-driven metrics
    const scored = candidates.map((article) => {
      const articleTagIds = article.ArticleTag.map((at) => at.tagId);
      const tagOverlap = articleTagIds.filter((tid) => topTagIds.includes(tid)).length;
      const tagScore = topTagIds.length > 0 ? (tagOverlap / topTagIds.length) * 50 : 0;
      const ageMs = now - new Date(article.publishedAt ?? article.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 7 - ageDays); // decays to 0 after 7 days
      const bookmarkPenalty = bookmarkedIds.has(article.id) ? -5 : 0;

      const score = tagScore + recencyScore + bookmarkPenalty;

      return {
        article,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const paginated = scored
      .slice(skip, skip + limit)
      .map(({ article }) => serializeArticle(article));
    const total = scored.length;

    try {
      await cacheSet(cacheKey, { articles: paginated, total }, CACHE_TTL.LISTING);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(
      successResponse(paginated, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err: any) {
    captureError(err);
    logger.error({ err }, "FEED ERROR");
    return NextResponse.json(errorResponse(err?.message || "Internal server error"), { status: 500 });
  }
}
