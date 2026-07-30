import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateGameSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { csrfProtection } from "@/middleware/csrfProtection";
import { syncGameToAlgolia, deleteGameFromAlgolia } from "@/workers/algolia.worker";
import { triggerFrontendRevalidation } from "@/lib/revalidate";
import { processSteamImagesForGame } from "@/lib/steamImageInterceptor";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        GameReview: {
          include: {
            Article: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                featuredImageUrl: true,
                contentType: true,
                publishedAt: true,
                status: true,
              },
            },
            ReviewScorePlatforms: { orderBy: { platform: "asc" } },
            ScoreHistory: { orderBy: { changedAt: "desc" } },
          },
        },
        ModGuide: {
          include: {
            Article: { select: { title: true, slug: true, publishedAt: true, status: true } },
          },
        },
        dlcs: {
          select: {
            id: true, title: true, slug: true, coverImageUrl: true, 
            releaseDate: true, gameEdition: true, rating: true,
          }
        },
        dlcOf: {
          select: { id: true, title: true, slug: true }
        }
      },
    });

    if (!game) return NextResponse.json(errorResponse("Game not found"), { status: 404 });

    // Hub stats: linked article count, community rating aggregate, and the
    // latest price per store (snapshots are newest-first, so the first row
    // seen for a shop is its most recent price).
    const [articlesCount, articleContentTypesRaw, ratingAgg, snapshots, dbSimilarGames] = await Promise.all([
      prisma.article.count({
        where: {
          status: "PUBLISHED",
          contentType: { not: "REVIEW" },
          // Kept in sync with the OR clause in games/[slug]/articles/route.ts
          // (the endpoint the Articles tab actually calls) — previously this
          // also matched on ArticleTag slug, which the tab's own query never
          // did, so the tab badge count and the list it opened into disagreed.
          OR: [
            { Game: { some: { id: game.id } } },
            { GameReview: { gameId: game.id } },
            { ModGuide: { gameId: game.id } },
          ],
        },
      }),
      prisma.article.groupBy({
        by: ['contentType'],
        where: {
          status: "PUBLISHED",
          contentType: { not: "REVIEW" },
          OR: [
            { Game: { some: { id: game.id } } },
            { GameReview: { gameId: game.id } },
            { ModGuide: { gameId: game.id } },
          ],
        },
      }),
      prisma.userRating.aggregate({
        where: { gameId: game.id },
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.priceSnapshot.findMany({
        where: { gameId: game.id },
        orderBy: { recordedAt: "desc" },
        take: 100,
      }),
      prisma.game.findMany({
        where: {
          OR: [
            { slug: { in: (game.similarGamesJson as any[] || []).map(g => g.slug) } }
          ],
          id: { not: game.id }
        },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          developer: true,
          publisher: true,
          releaseDate: true,
          platforms: true,
          genres: true,
        },
        take: 12
      })
    ]);

    const seenShops = new Set<string>();
    const priceData = snapshots
      .filter((s) => {
        if (seenShops.has(s.shop)) return false;
        seenShops.add(s.shop);
        return true;
      })
      .map((s) => ({
        shop: s.shop,
        priceINR: Number(s.priceINR),
        cutPercent: s.cutPercent,
        url: s.url,
        recordedAt: s.recordedAt,
      }))
      .sort((a, b) => a.priceINR - b.priceINR);

    return NextResponse.json(
      successResponse({
        ...game,
        articlesCount,
        articleContentTypes: articleContentTypesRaw.map(g => g.contentType),
        userRatings: {
          average: ratingAgg._avg.score !== null ? Number(ratingAgg._avg.score.toFixed(1)) : 0,
          count: ratingAgg._count._all,
        },
        priceData,
        dbSimilarGames,
      })
    );
  } catch (err: any) {
    logger.error("API GET ERROR:", err);
    captureError(err);
    return NextResponse.json(errorResponse(err.message || "Internal server error"), {
      status: 500,
    });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateGameSchema);
    if (error) return error;

    const { slug } = await params;
    const game = await prisma.game.findUnique({ where: { slug } });
    if (!game) return NextResponse.json(errorResponse("Game not found"), { status: 404 });

    if (data.releaseDate) {
      if (new Date(data.releaseDate).getTime() > Date.now()) {
        (data as any).releaseStatus = "Coming Soon";
      } else if (game.releaseStatus === "Coming Soon") {
        (data as any).releaseStatus = "Released";
      }
    }

    await processSteamImagesForGame(data, game.id);

    const updated = await prisma.game.update({ where: { id: game.id }, data: data as any });

    try {
      await cacheDeletePattern("games:list:*");
      await triggerFrontendRevalidation("/games");
      await triggerFrontendRevalidation(`/games/${updated.slug}`);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    try {
      await syncGameToAlgolia(updated.id);
    } catch (err) {
      logger.warn({ err }, "Algolia sync enqueue failed");
    }

    return NextResponse.json(successResponse(updated, "Game updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;
    // slug could be an id if no slug was available
    const game = await prisma.game.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!game) return NextResponse.json(errorResponse("Game not found"), { status: 404 });

    await prisma.game.delete({ where: { id: game.id } });

    try {
      await cacheDeletePattern("games:list:*");
      await triggerFrontendRevalidation("/games");
      await triggerFrontendRevalidation(`/games/${game.slug}`);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    try {
      await deleteGameFromAlgolia(game.id);
    } catch (err) {
      logger.warn({ err }, "Algolia delete enqueue failed");
    }

    return NextResponse.json(successResponse(null, "Game deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
