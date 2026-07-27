import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode: modeSlug } = await params;
    
    const cacheKey = `modes:v2:${modeSlug}`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // 1. Find exact mode name matching the slug
    const allModes = await prisma.$queryRaw<{ mode: string }[]>`SELECT DISTINCT unnest("gameModes") as mode FROM "Game"`;
    const match = allModes.find(m => slugify(m.mode) === modeSlug);
    
    if (!match) {
      return NextResponse.json(errorResponse("Game mode not found"), { status: 404 });
    }
    
    const exactMode = match.mode;

    // 2. Fetch related data
    const [gameCount, topGames, relatedModesRaw] = await Promise.all([
      prisma.game.count({
        where: { gameModes: { has: exactMode } }
      }),
      prisma.game.findMany({
        where: { gameModes: { has: exactMode } },
        orderBy: [
          { avgUserScore: { sort: 'desc', nulls: 'last' } },
          { totalRating: { sort: 'desc', nulls: 'last' } }
        ],
        take: 60,
        select: { id: true, slug: true, title: true, coverImageUrl: true },
      }),
      prisma.$queryRaw<{ related: string; count: number }[]>`
        SELECT unnest("gameModes") as related, count(*)::int as count
        FROM "Game"
        WHERE ${exactMode} = ANY("gameModes")
        GROUP BY related
        ORDER BY count DESC
        LIMIT 7
      `
    ]);

    const relatedModes = relatedModesRaw
      .map(r => r.related)
      .filter(r => r !== exactMode)
      .slice(0, 6);

    const result = {
      genre: exactMode, // Reusing genre field for frontend compatibility
      gameCount,
      topGames,
      relatedGenres: relatedModes // Reusing relatedGenres field
    };

    try {
      await cacheSet(cacheKey, result, CACHE_TTL.LONG);
    } catch (err) {
      logger.warn({ err }, "Cache write failed");
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
