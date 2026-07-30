import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { createGameSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { csrfProtection } from "@/middleware/csrfProtection";
import { syncGameToAlgolia, syncGame } from "@/workers/algolia.worker";
import { triggerFrontendRevalidation } from "@/lib/revalidate";
import { processSteamImagesForGame } from "@/lib/steamImageInterceptor";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams, 20, 10000);

    const search = searchParams.get("search");
    const exclude = searchParams.get("exclude");
    const genres = searchParams.get("genres");
    const sort = searchParams.get("sort");
    const publisher = searchParams.get("publisher");
    // Filter by collection name (series) — exact match, case-insensitive.
    // Used when clicking a collection tag on the game detail page.
    const collection = searchParams.get("collection");
    // "card" is the lean projection used by public listing/selector UIs (game
    // grids, homepage rows, the article-editor game picker) — none of them
    // render the dozens of IGDB metadata/JSON columns on the full Game row.
    // Omit `fields` entirely (default) to keep getting the full row, which
    // the admin games grid still needs since it edits directly from this list.
    const fields = searchParams.get("fields");
    const cardSelect = {
      id: true, slug: true, title: true, publisher: true, coverImageUrl: true,
      releaseDate: true, releaseStatus: true, platforms: true, genres: true, totalRating: true,
    } as const;

    const where: any = {};
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (exclude) where.slug = { not: exclude };
    if (genres) where.genres = { hasSome: genres.split(",") };
    if (publisher) where.publisher = publisher;
    if (collection) where.collectionName = { equals: collection, mode: "insensitive" };
    // "Newest" means already-released games, ranked by release date — exclude
    // games with a future/unannounced release date (e.g. scheduled, unreleased titles).
    if (sort === "newest") where.releaseDate = { lte: new Date() };
    // "Coming Soon" — filter by the explicit releaseStatus field (the same value
    // shown on the game detail page and set by the admin / IGDB import).
    if (sort === "coming-soon") where.releaseStatus = "Coming Soon";

    let orderBy: any = { title: "asc" };
    if (sort === "newest") orderBy = { releaseDate: { sort: "desc", nulls: "last" } };
    if (sort === "oldest") orderBy = { releaseDate: { sort: "asc", nulls: "last" } };
    if (sort === "top-rated") orderBy = { totalRating: { sort: "desc", nulls: "last" } };
    if (sort === "popular") orderBy = { igdbFollows: { sort: "desc", nulls: "last" } };
    if (sort === "coming-soon") orderBy = { releaseDate: { sort: "asc", nulls: "last" } };

    const cacheKey = `games:list:p${page}:l${limit}:q${search || ""}:g${genres || ""}:s${sort || ""}:pub${publisher || ""}:col${collection || ""}:f${fields || ""}`;

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

    const [games, total] = await withRetry(() =>
      Promise.all([
        prisma.game.findMany({
          where, skip, take: limit, orderBy,
          ...(fields === "card" ? { select: cardSelect } : {}),
        }),
        prisma.game.count({ where }),
      ])
    );

    try {
      await cacheSet(cacheKey, { data: games, total }, CACHE_TTL.MEDIUM);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(
      successResponse(games, undefined, buildPaginationMeta(page, limit, total))
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
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, createGameSchema);
    if (error) return error;

    const slug = await generateUniqueSlug(data.title, "game");
    
    if (data.releaseDate && new Date(data.releaseDate).getTime() > Date.now()) {
      (data as any).releaseStatus = "Coming Soon";
    }

    const game = await withRetry(() =>
      prisma.game.create({
        data: {
          ...data,
          slug,
          platforms: data.platforms || [],
          genres: data.genres || [],
          tags: data.tags || [],
          gameEdition: data.gameEdition || 'STANDARD',
          dlcOfId: data.dlcOfId ?? null,
        } as any,
      })
    );

    const hasSteamImages = await processSteamImagesForGame(data, game.id);
    if (hasSteamImages) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          coverImageUrl: data.coverImageUrl,
          backgroundImageUrl: data.backgroundImageUrl,
        }
      });
      (game as any).coverImageUrl = data.coverImageUrl;
      (game as any).backgroundImageUrl = data.backgroundImageUrl;
    }

    try {
      await cacheDeletePattern("games:list:*");
      await triggerFrontendRevalidation("/games");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    // Sync to Algolia immediately (direct call) so the game appears on the
    // public /games page right away, without waiting for the BullMQ worker.
    // The queue job below is kept as a retry/backup in case the direct call fails.
    try {
      await syncGame(game.id);
    } catch (err) {
      logger.warn({ err }, "Direct Algolia sync failed — falling back to queue");
      try {
        await syncGameToAlgolia(game.id);
      } catch (queueErr) {
        logger.warn({ queueErr }, "Algolia sync enqueue also failed");
      }
    }

    return NextResponse.json(successResponse(game, "Game created"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
