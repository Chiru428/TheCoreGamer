import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { searchIGDB, getIGDBGame, mapIGDBToDb, mapIGDBGameToDb, mapIGDBStatus, resolveCoverUrl } from "@/lib/igdb";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/games/igdb-search
 * - ?q=          → search IGDB (admin/editor only), top 10 results
 * - ?id=         → full mapped IGDB game data (public, used by game detail page)
 * - ?id=&type=videos → only the videos array
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, "READ");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const idParam = searchParams.get("id");
  const type = searchParams.get("type");

  try {
    if (idParam) {
      const igdbId = Number(idParam);
      if (!Number.isFinite(igdbId)) {
        return NextResponse.json(errorResponse("Invalid id", "id must be a number"), { status: 400 });
      }

      // ?refresh=1 lets admins/editors bypass the cache for a manual re-sync
      let bypassCache = false;
      if (searchParams.get("refresh") === "1") {
        const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
        if (!roleCheck) bypassCache = true;
      }

      const cacheKey = `igdb:game:${igdbId}`;
      let mapped: ReturnType<typeof mapIGDBToDb> | null = null;
      if (!bypassCache) {
        try {
          mapped = await cacheGet<ReturnType<typeof mapIGDBToDb>>(cacheKey);
        } catch {
          /* intentionally empty */
        }
      }
      if (!mapped) {
        const igdbGame = await getIGDBGame(igdbId);
        mapped = mapIGDBToDb(igdbGame);
        try {
          await cacheSet(cacheKey, mapped, CACHE_TTL.DAY);
        } catch {
          /* intentionally empty */
        }

        try {
          const existingGame = await prisma.game.findUnique({
            where: { igdbId },
            select: { id: true, coverImageUrl: true, backgroundImageUrl: true, websitesJson: true },
          });
          if (existingGame) {
            const dbData = mapIGDBGameToDb(igdbGame);
            delete (dbData as any).title; // never overwrite editorial title

            // Cover/background images are managed via the game form — never
            // let this auto-refresh overwrite the admin's chosen images.
            delete dbData.coverImageUrl;
            delete dbData.backgroundImageUrl;

            // Merge website links instead of replacing them outright, so
            // curated links that IGDB doesn't (or no longer) reports aren't lost.
            const existingWebsites = (existingGame.websitesJson as Record<string, string> | null) || {};
            const newWebsites = (dbData.websitesJson as Record<string, string | undefined> | undefined) || {};
            const mergedWebsites: Record<string, string> = { ...existingWebsites };
            for (const [key, value] of Object.entries(newWebsites)) {
              if (value) mergedWebsites[key] = value;
            }
            dbData.websitesJson = mergedWebsites as unknown as typeof dbData.websitesJson;

            await prisma.game.update({ where: { igdbId }, data: dbData });
            await cacheDeletePattern("games:list:*");
            logger.info(`[IGDB] Auto-refreshed Game record for igdbId ${igdbId}`);
          }
        } catch (persistErr) {
          logger.warn({ persistErr }, "[IGDB] DB auto-refresh failed (non-fatal)");
        }
      }

      if (type === "videos") {
        return NextResponse.json(successResponse({ videos: mapped.videos }));
      }

      return NextResponse.json(successResponse(mapped));
    }

    // Search — admin/editor only
    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    if (!q || q.length < 2) {
      return NextResponse.json(successResponse([]));
    }

    const cacheKey = `igdb:search:${q.toLowerCase()}`;
    let results: ReturnType<typeof mapSearchResults> | null = null;
    try {
      results = await cacheGet<ReturnType<typeof mapSearchResults>>(cacheKey);
    } catch {
      /* intentionally empty */
    }
    if (!results) {
      const igdbGames = await searchIGDB(q);
      results = mapSearchResults(igdbGames);
      try {
        await cacheSet(cacheKey, results, CACHE_TTL.HOUR);
      } catch {
        /* intentionally empty */
      }
    }

    return NextResponse.json(successResponse(results));
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)));
    logger.error({ err }, "[IGDB Search] Request failed");
    return NextResponse.json(errorResponse("IGDB request failed"), { status: 502 });
  }
}

function mapSearchResults(igdbGames: Awaited<ReturnType<typeof searchIGDB>>) {
  return igdbGames.map((g) => ({
    igdbId: g.id,
    name: g.name,
    coverUrl: resolveCoverUrl(g),
    releaseYear: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    platforms: g.platforms?.map((p) => p.name) ?? [],
    genres: g.genres?.map((genre) => genre.name) ?? [],
    developer: g.involved_companies?.find((c) => c.developer)?.company?.name ?? null,
    summary: g.summary ?? null,
    releaseStatus: mapIGDBStatus(g.status, g.first_release_date),
  }));
}
