import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import {
  parsePagination,
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import type { ContentType } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

const CONTENT_TYPES = [
  "NEWS",
  "REVIEW",
  "MOD_GUIDE",
  "WALKTHROUGH",
  "OPINION",
  "DEAL",
  "FEATURE",
  "LISTICLE",
] as const;

/**
 * GET /api/games/[slug]/articles
 * Paginated published articles linked to this game (Game relation on Article).
 * Params: page, limit (default 10), contentType.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams, 10, 50);

    const contentTypeRaw = searchParams.get("contentType");
    if (contentTypeRaw && !CONTENT_TYPES.includes(contentTypeRaw as (typeof CONTENT_TYPES)[number])) {
      return NextResponse.json(errorResponse("Invalid contentType"), { status: 400 });
    }
    const contentType = (contentTypeRaw as ContentType) || undefined;

    const cacheKey = `game:${slug}:articles:p${page}:l${limit}:ct${contentType ?? "all"}`;
    try {
      const cached = await cacheGet<{ articles: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json(
          successResponse(cached.articles, undefined, buildPaginationMeta(page, limit, cached.total))
        );
      }
    } catch {
      /* cache miss is fine */
    }

    const game = await withRetry(() =>
      prisma.game.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    const where = {
      status: "PUBLISHED" as const,
      OR: [
        { Game: { some: { id: game.id } } },
        { GameReview: { gameId: game.id } },
        { ModGuide: { gameId: game.id } },
      ],
      ...(contentType ? { contentType } : { contentType: { not: "REVIEW" as ContentType } }),
    };

    const [articles, total] = await withRetry(() =>
      Promise.all([
        prisma.article.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            featuredImageUrl: true,
            contentType: true,
            publishedAt: true,
            isBreaking: true,
            isSponsored: true,
            User_Article_authorIdToUser: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            GameReview: { select: { id: true, reviewScore: true } },
          },
          orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
          skip,
          take: limit,
        }),
        prisma.article.count({ where }),
      ])
    );

    const serialized = articles.map(serializeArticle);

    try {
      await cacheSet(cacheKey, { articles: serialized, total }, CACHE_TTL.MEDIUM);
    } catch {
      /* best-effort cache */
    }

    return NextResponse.json(
      successResponse(serialized, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
