import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { importIgdbSchema } from "@/validators";
import { searchIGDB, getIGDBGame, mapIGDBGameToDb, resolveCoverUrl } from "@/lib/igdb";
import { addIGDBImportJob } from "@/lib/bullmq";
import { syncGame } from "@/workers/algolia.worker";
import { cacheDeletePattern } from "@/lib/redis";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/games/import-igdb?q=title
 * Search IGDB for games matching a title (top 5 results).
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json(
        errorResponse("Missing query", "The ?q= search parameter is required"),
        { status: 400 }
      );
    }

    const results = await searchIGDB(q);

    const games = results.map((g) => ({
      igdbId: g.id,
      name: g.name,
      coverUrl: resolveCoverUrl(g),
      releaseYear: g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null,
      platforms: g.platforms?.map((p) => p.name) ?? [],
      genres: g.genres?.map((genre) => genre.name) ?? [],
    }));

    return NextResponse.json(successResponse(games));
  } catch (err) {
    captureError(err);
    logger.error({ err }, "[IGDB Import] Search failed");
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * POST /api/admin/games/import-igdb
 * Body: { igdbId, gameId } — imports IGDB data into an existing Game and
 * dispatches a background sync job.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfCheck = csrfProtection(request);
    if (csrfCheck) return csrfCheck;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, importIgdbSchema);
    if (error) return error;

    const game = await prisma.game.findUnique({ where: { id: data.gameId } });
    if (!game) {
      return NextResponse.json(errorResponse("Not found", "Game not found"), { status: 404 });
    }

    // igdbId is unique — reject if another game already claims it
    const conflict = await prisma.game.findUnique({ where: { igdbId: data.igdbId } });
    if (conflict && conflict.id !== data.gameId) {
      return NextResponse.json(
        errorResponse("Conflict", `IGDB game already linked to "${conflict.title}"`),
        { status: 409 }
      );
    }

    const igdbGame = await getIGDBGame(data.igdbId);
    const mapped = mapIGDBGameToDb(igdbGame);

    // Preserve the locally curated title — slug is derived from it
    delete mapped.title;
    delete mapped.igdbSlug;

    // Cover/background images are managed via the game form — the resync
    // must never overwrite the admin's chosen images.
    delete mapped.coverImageUrl;
    delete mapped.backgroundImageUrl;

    // Preserve user-curated scalar fields if they already exist in the DB
    if (game.developer) delete mapped.developer;
    if (game.publisher) delete mapped.publisher;
    if (game.description) delete mapped.description;
    if (game.releaseDate) delete mapped.releaseDate;
    if (game.platforms?.length) delete mapped.platforms;
    if (game.genres?.length) delete mapped.genres;
    if (game.tags?.length) delete mapped.tags;
    if (game.themes?.length) delete mapped.themes;
    if (game.keywords?.length) delete mapped.keywords;
    if (game.steamAppId) delete mapped.steamAppId;
    if (game.esrbRating) delete mapped.esrbRating;
    if (game.pegiRating) delete mapped.pegiRating;

    // Merge website links instead of replacing them outright, so curated
    // links that IGDB doesn't (or no longer) reports aren't lost on resync.
    const existingWebsites = (game.websitesJson as Record<string, string> | null) || {};
    const newWebsites = (mapped.websitesJson as Record<string, string | undefined> | undefined) || {};
    const mergedWebsites: Record<string, string> = { ...existingWebsites };
    for (const [key, value] of Object.entries(newWebsites)) {
      if (value) mergedWebsites[key] = value;
    }
    mapped.websitesJson = mergedWebsites as unknown as Prisma.InputJsonValue;

    const updated = await prisma.game.update({
      where: { id: data.gameId },
      data: mapped,
    });

    try {
      await cacheDeletePattern("games:list:*");
    } catch {
      /* intentionally empty */
    }

    // Background job re-syncs and caches the IGDB payload
    await addIGDBImportJob({ igdbId: data.igdbId, gameId: data.gameId });

    // Re-sync to Algolia immediately so that IGDB-populated fields like
    // themes, gameModes, and playerPerspectives appear in filters right away.
    // (The initial game creation sync runs before IGDB data is saved, so
    // those arrays are empty in the first Algolia record.)
    try {
      await syncGame(data.gameId);
    } catch (algoliaErr) {
      logger.warn({ algoliaErr }, "[IGDB Import] Algolia re-sync after IGDB import failed");
    }

    logger.info(`[IGDB Import] Linked Game "${updated.title}" to IGDB ${data.igdbId}`);
    return NextResponse.json(successResponse(updated, "Game updated from IGDB"));
  } catch (err) {
    captureError(err);
    logger.error({ err }, "[IGDB Import] Import failed");
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
