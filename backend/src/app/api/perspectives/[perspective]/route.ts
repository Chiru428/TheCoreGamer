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
  { params }: { params: Promise<{ perspective: string }> }
) {
  try {
    const { perspective: perspectiveSlug } = await params;
    
    const cacheKey = `perspectives:v2:${perspectiveSlug}`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // 1. Find exact perspective name matching the slug
    const allPerspectives = await prisma.$queryRaw<{ perspective: string }[]>`SELECT DISTINCT unnest("playerPerspectives") as perspective FROM "Game"`;
    const match = allPerspectives.find(p => slugify(p.perspective) === perspectiveSlug);
    
    if (!match) {
      return NextResponse.json(errorResponse("Player perspective not found"), { status: 404 });
    }
    
    const exactPerspective = match.perspective;

    // 2. Fetch related data
    const [gameCount, topGames, relatedPerspectivesRaw] = await Promise.all([
      prisma.game.count({
        where: { playerPerspectives: { has: exactPerspective } }
      }),
      prisma.game.findMany({
        where: { playerPerspectives: { has: exactPerspective } },
        orderBy: [
          { aggregatedRating: { sort: 'desc', nulls: 'last' } },
          { totalRating: { sort: 'desc', nulls: 'last' } }
        ],
        take: 60,
        select: { id: true, slug: true, title: true, coverImageUrl: true },
      }),
      prisma.$queryRaw<{ related: string; count: number }[]>`
        SELECT unnest("playerPerspectives") as related, count(*)::int as count
        FROM "Game"
        WHERE ${exactPerspective} = ANY("playerPerspectives")
        GROUP BY related
        ORDER BY count DESC
        LIMIT 7
      `
    ]);

    const relatedPerspectives = relatedPerspectivesRaw
      .map(r => r.related)
      .filter(r => r !== exactPerspective)
      .slice(0, 6);

    const result = {
      genre: exactPerspective, // Reusing genre field for frontend compatibility
      gameCount,
      topGames,
      relatedGenres: relatedPerspectives // Reusing relatedGenres field
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
