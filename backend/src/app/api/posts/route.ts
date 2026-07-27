import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole, requireAuth } from "@/middleware/requireRole";
import { createArticleSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import {
  parsePagination,
  buildPaginationMeta,
  successResponse,
  errorResponse,
  serializeArticle,
} from "@/types";
import type { Prisma, ArticleStatus, ContentType } from "@/generated/prisma";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const session = await auth();
    const role = session?.user?.role;
    const isPrivileged = role === "ADMIN" || role === "EDITOR";
    // AUTHOR can see their own non-published posts (drafts, in review, etc.) by explicitly
    // passing mine=true — this is what the admin Posts page does. Without it, an AUTHOR-role
    // account hitting this same endpoint from a public listing page still only ever sees
    // published content, same as any other reader — this endpoint is shared with 8+ public
    // pages (news, articles, deals, ...), so scoping can't be inferred from role alone.
    const ownScopeId = role === "AUTHOR" && searchParams.get("mine") === "true" ? session?.user?.id : undefined;
    const canSeeAllStatuses = isPrivileged || !!ownScopeId;

    const where: Prisma.ArticleWhereInput = {};

    const statusParam = searchParams.get("status");
    if (statusParam && canSeeAllStatuses) {
      where.status = statusParam as ArticleStatus;
    } else if (!canSeeAllStatuses) {
      where.status = "PUBLISHED";
    }

    if (ownScopeId) {
      // Match both the primary author (Article.authorId) and any co-author credited
      // via the ArticleAuthor byline table. Composed through AND (not the top-level
      // OR) so it doesn't collide with the `search` param below, which also sets
      // where.OR — both can be active at once (an author searching their own posts).
      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        { OR: [{ authorId: ownScopeId }, { ArticleAuthor: { some: { userId: ownScopeId } } }] },
      ];
    }

    const tag = searchParams.get("tag");
    if (tag) where.ArticleTag = { some: { Tag: { slug: tag } } };

    const contentType = searchParams.get("contentType");
    if (contentType) where.contentType = contentType as ContentType;

    const excludeContentType = searchParams.get("excludeContentType");
    if (excludeContentType && !contentType) {
      where.contentType = { not: excludeContentType as ContentType };
    }

    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    if (searchParams.get("featured") === "true") where.featured = true;
    if (searchParams.get("breaking") === "true") where.isBreaking = true;

    const gameSlug = searchParams.get("gameSlug");
    if (gameSlug) {
      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        {
          OR: [
            { Game: { some: { slug: gameSlug } } },
            { GameReview: { Game: { slug: gameSlug } } },
            { ModGuide: { Game: { slug: gameSlug } } },
            { ArticleTag: { some: { Tag: { slug: gameSlug } } } },
          ],
        },
      ];
    }

    const platform = searchParams.get("platform");
    const genre = searchParams.get("genre");
    if (platform || genre) {
      const gameFilters: any = {};
      if (platform) gameFilters.platforms = { hasSome: platform.split(',') };
      if (genre) gameFilters.genres = { hasSome: genre.split(',') };

      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        { Game: { some: gameFilters } },
      ];
    }

    const sort = searchParams.get("sort");
    // We sort by COALESCE(publishedAt, createdAt) to match what article cards display.
    // Articles where publishedAt is NULL fall back to createdAt for both display and sort order.
    let orderBy: any[] = [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    if (sort === "oldest") orderBy = [{ publishedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }];
    if (sort === "alphabetical") orderBy = [{ title: "asc" }];
    if (sort === "updated") orderBy = [{ updatedAt: "desc" }];
    if (sort === "popular") orderBy = [{ viewCount: "desc" }];

    const featured = searchParams.get("featured");
    const isBreaking = searchParams.get("breaking");
    const statusKey = canSeeAllStatuses ? statusParam || "all" : "published";
    const scopeKey = ownScopeId ? `:mine${ownScopeId}` : "";
    const cacheKey = `posts:list:p${page}:l${limit}:s${statusKey}${scopeKey}:t${tag || ""}:ct${contentType || ""}:exct${excludeContentType || ""}:q${search || ""}:g${gameSlug || ""}:sort${sort || "default"}:feat${featured || ""}:brk${isBreaking || ""}:plat${platform || ""}:gen${genre || ""}`;

    try {
      const cached = await cacheGet<{ data: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json(
          successResponse(cached.data, undefined, buildPaginationMeta(page, limit, cached.total))
        );
      }
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // Avoid Promise.all to prevent connection pool exhaustion during concurrent SWR fetches
    let articles: any[] = [];
    let total = 0;
    
    await withRetry(async () => {
      articles = await prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          featuredImageUrl: true,
          contentType: true,
          status: true,
          featured: true,
          isBreaking: true,
          isSponsored: true,
          sponsorName: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true,
          authorId: true,
          deletionRequestedAt: true,
          deletionRequestReason: true,
          User_Article_authorIdToUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
          },
          User_Article_deletionRequestedByIdToUser: {
            select: { id: true, displayName: true },
          },
          ArticleTag: { select: { Tag: { select: { id: true, name: true, slug: true } } } },
          GameReview: {
            select: {
              id: true,
              reviewScore: true,
              verdict: true,
              gameId: true,
              Game: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
            },
          },
          ModGuide: {
            select: {
              id: true,
              gameId: true,
              gameVersion: true,
              gameVersionDate: true,
              lastVerifiedAt: true,
              lastVerifiedVersion: true,
              User_ModGuide_lastVerifiedByIdToUser: {
                select: { id: true, displayName: true, avatarUrl: true },
              },
              Game: { select: { id: true, title: true, slug: true } },
              MediaAttachment: {
                select: {
                  id: true,
                  filename: true,
                  fileUrl: true,
                  mimeType: true,
                  fileSizeBytes: true,
                },
              },
            },
          },
          Game: { select: { id: true, title: true } },
          _count: {
            select: {
              Comment: { where: { status: "APPROVED" } },
              ArticleReaction: { where: { type: "LIKE" } },
            },
          },
        },
      });
      
      total = await prisma.article.count({ where });
    });

    const serializedArticles = articles.map(serializeArticle);

    try {
      await cacheSet(cacheKey, { data: serializedArticles, total }, CACHE_TTL.LISTING);
    } catch (err) {
      logger.warn({ err }, "Cache write failed");
    }

    return NextResponse.json(
      successResponse(serializedArticles, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    try {
      captureError(err, { route: "GET /api/posts" });
    } catch (e) {
      logger.error("Failed to capture error: " + (e instanceof Error ? e.message : String(e)));
    }
    return new NextResponse(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    if (!["AUTHOR", "EDITOR", "ADMIN"].includes(session!.user.role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const { data, error } = await validateBody(request, createArticleSchema);
    if (error) return error;

    if (data.pendingDraftId) {
      try {
        await (await import("@/lib/redis")).redis.del(`autosave:pending:${data.pendingDraftId}`);
      } catch (e) {}
    }

    const slug = data.slug
      ? await generateUniqueSlug(data.slug)
      : await generateUniqueSlug(data.title);

    const article = await withRetry(() =>
      prisma.article.create({
        data: {
          title: data.title,
          slug,
          content: data.content as any,
          excerpt: data.excerpt,
          featuredImageUrl: data.featuredImageUrl,
          featuredImageCredit: data.featuredImageCredit,
          contentType: data.contentType,
          authorId: session!.user.id,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          featured: data.featured,
          isBreaking: data.isBreaking,
          isSponsored: data.isSponsored,
          sponsorName: data.sponsorName,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          status: "DRAFT",
          ArticleTag: data.tagIds
            ? { create: data.tagIds.map((tagId: string) => ({ tagId })) }
            : undefined,
          Game: data.gameIds ? { connect: data.gameIds.map((id: string) => ({ id })) } : undefined,
        },
        include: {
          User_Article_authorIdToUser: { select: { id: true, username: true, displayName: true } },
          ArticleTag: { include: { Tag: true } },
          Game: { select: { id: true, title: true } },
        },
      })
    );

    try {
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    const serializedArticle = serializeArticle(article);
    return NextResponse.json(successResponse(serializedArticle, "Article created"), {
      status: 201,
    });
  } catch (err) {
    captureError(err, { route: "POST /api/posts" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
