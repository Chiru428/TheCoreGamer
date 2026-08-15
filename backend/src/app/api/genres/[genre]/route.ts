import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  try {
    const { genre: genreSlug } = await params;
    
    const cacheKey = `genres:v2:${genreSlug}`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // 1. Find exact genre name matching the slug
    const allGenres = await prisma.$queryRaw<{ genre: string }[]>`SELECT DISTINCT unnest(genres) as genre FROM "Game"`;
    const match = allGenres.find(g => slugify(g.genre) === genreSlug);
    
    if (!match) {
      return NextResponse.json(errorResponse("Genre not found"), { status: 404 });
    }
    
    const exactGenre = match.genre;

    // 2. Fetch related data
    // Note: this route's response has no "latestArticles" field — the genre
    // page only renders gameCount/topGames/relatedGenres, so that query
    // (8 articles × User/Tag/GameReview/ModGuide joins) was pure dead weight.
    const [gameCount, topGames, relatedGenresRaw] = await Promise.all([
      prisma.game.count({
        where: { genres: { has: exactGenre } }
      }),
      prisma.game.findMany({
        where: { genres: { has: exactGenre } },
        orderBy: [
          { aggregatedRating: { sort: 'desc', nulls: 'last' } },
          { totalRating: { sort: 'desc', nulls: 'last' } }
        ],
        take: 60,
        select: { id: true, slug: true, title: true, coverImageUrl: true },
      }),
      prisma.$queryRaw<{ related: string; count: number }[]>`
        SELECT unnest(genres) as related, count(*)::int as count
        FROM "Game"
        WHERE ${exactGenre} = ANY(genres)
        GROUP BY related
        ORDER BY count DESC
        LIMIT 7
      `
    ]);

    const relatedGenres = relatedGenresRaw
      .map(r => r.related)
      .filter(r => r !== exactGenre)
      .slice(0, 6);

    const result = {
      genre: exactGenre,
      gameCount,
      topGames,
      relatedGenres
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
