import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { createReviewSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import {
  parsePagination,
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import type { Prisma } from "@/generated/prisma";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL, getScoreBadge } from "@/lib/constants";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const sort = searchParams.get("sort");
    let orderBy: any[] = [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    if (sort === "oldest") orderBy = [{ publishedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }];
    if (sort === "alphabetical") orderBy = [{ title: "asc" }];
    if (sort === "updated") orderBy = [{ updatedAt: "desc" }];
    if (sort === "popular") orderBy = [{ viewCount: "desc" }];

    const platform = searchParams.get("platform");
    const genre = searchParams.get("genre");
    const score = searchParams.get("score");
    const year = searchParams.get("year");
    const tag = searchParams.get("tag");

    const cacheKey = `reviews:list:p${page}:l${limit}:sort${sort || "default"}:p${platform || ''}:g${genre || ''}:s${score || ''}:y${year || ''}:t${tag || ''}`;

    const gameReviewFilter: any = {};
    const andConditions: any[] = [];

    if (platform) {
      gameReviewFilter.platforms = { hasSome: platform.split(',') };
    }
    
    if (genre) {
      gameReviewFilter.genres = { hasSome: genre.split(',') };
    }

    if (year) {
      const years = year.split(',').map(Number).filter(y => !isNaN(y));
      if (years.length > 0) {
        const yearOrs = years.map(y => ({
          releaseDate: {
            gte: new Date(`${y}-01-01T00:00:00.000Z`),
            lt: new Date(`${y + 1}-01-01T00:00:00.000Z`)
          }
        }));
        andConditions.push({ OR: yearOrs });
      }
    }

    if (score) {
      const scores = score.split(',');
      const scoreOrs = scores.map(s => {
        if (s === '10') return { reviewScore: { equals: 10 } };
        if (s === '0-1') return { reviewScore: { gte: 0, lt: 2 } };
        const num = Number(s);
        if (!isNaN(num)) return { reviewScore: { gte: num, lt: num + 1 } };
        return null;
      }).filter(Boolean);
      
      if (scoreOrs.length > 0) {
        andConditions.push({ OR: scoreOrs });
      }
    }

    if (andConditions.length > 0) {
      gameReviewFilter.AND = andConditions;
    }

    const whereClause: any = { status: "PUBLISHED", contentType: "REVIEW" };
    if (Object.keys(gameReviewFilter).length > 0) {
      whereClause.GameReview = gameReviewFilter;
    }

    if (tag) {
      whereClause.ArticleTag = {
        some: { Tag: { name: { in: tag.split(',') } } }
      };
    }

    try {
      const cached = await cacheGet<{ data: unknown[]; total: number }>(cacheKey);
      if (cached)
        return NextResponse.json(
          successResponse(
            cached.data as any,
            undefined,
            buildPaginationMeta(page, limit, cached.total)
          )
        );
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    const [reviews, total] = await withRetry(() =>
      Promise.all([
        prisma.article.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy,
          include: {
            User_Article_authorIdToUser: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            ArticleTag: { include: { Tag: true } },
            GameReview: true,
            _count: { select: { Comment: { where: { status: "APPROVED" } } } },
          },
        }),
        prisma.article.count({ where: whereClause }),
      ])
    );

    const serializedReviews = reviews.map((r) => {
      const base = serializeArticle(r) as any;
      if (r.GameReview) base.scoreBadge = getScoreBadge(Number(r.GameReview.reviewScore));
      return base;
    });

    try {
      await cacheSet(cacheKey, { data: serializedReviews, total }, CACHE_TTL.MEDIUM);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(
      successResponse(serializedReviews, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { data, error } = await validateBody(request, createReviewSchema);
    if (error) return error;

    if (data.pendingDraftId) {
      try {
        await (await import("@/lib/redis")).redis.del(`autosave:pending:${data.pendingDraftId}`);
      } catch (e) {}
    }

    const slug = data.slug
      ? await generateUniqueSlug(data.slug)
      : await generateUniqueSlug(data.title);

    const result = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            title: data.title,
            slug,
            content: data.content as Prisma.InputJsonValue,
            excerpt: data.excerpt,
            featuredImageUrl: data.featuredImageUrl,
            featuredImageCredit: data.featuredImageCredit,
            contentType: "REVIEW",
            authorId: session!.user.id,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription,
            status: data.status || "DRAFT",
            ArticleTag: data.tagIds
              ? { create: data.tagIds.map((id: string) => ({ tagId: id })) }
              : undefined,
            Game: data.gameIds
              ? { connect: data.gameIds.map((id: string) => ({ id })) }
              : undefined,
          },
        });

        const review = await tx.gameReview.create({
          data: {
            articleId: article.id,
            gameTitle: data.gameTitle,
            developer: data.developer,
            publisher: data.publisher,
            releaseDate: new Date(data.releaseDate),
            platforms: data.platforms,
            genres: data.genres,
            reviewScore: data.reviewScore,
            verdict: data.verdict,
            gameId: data.gameId,
            showReviewDetails: data.showReviewDetails,
          },
        });

        return { article, review };
      })
    );

    try {
      await cacheDeletePattern("reviews:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(result, "Review created"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
