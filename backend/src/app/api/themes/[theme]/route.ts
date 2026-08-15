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
  { params }: { params: Promise<{ theme: string }> }
) {
  try {
    const { theme: themeSlug } = await params;
    
    const cacheKey = `themes:v2:${themeSlug}`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // 1. Find exact theme name matching the slug
    // themes is a string like "Action, Horror", we need to split by comma
    const allGamesWithThemes = await prisma.game.findMany({
      where: { themes: { not: null } },
      select: { themes: true }
    });
    
    const uniqueThemes = new Set<string>();
    for (const g of allGamesWithThemes) {
      if (g.themes) {
        g.themes.split(',').forEach(t => uniqueThemes.add(t.trim()));
      }
    }
    
    const exactTheme = Array.from(uniqueThemes).find(t => slugify(t) === themeSlug);
    
    if (!exactTheme) {
      return NextResponse.json(errorResponse("Theme not found"), { status: 404 });
    }

    // 2. Fetch related data
    const [gameCount, topGames] = await Promise.all([
      prisma.game.count({
        where: { themes: { contains: exactTheme } }
      }),
      prisma.game.findMany({
        where: { themes: { contains: exactTheme } },
        orderBy: [
          { aggregatedRating: { sort: 'desc', nulls: 'last' } },
          { totalRating: { sort: 'desc', nulls: 'last' } }
        ],
        take: 60,
        select: { id: true, slug: true, title: true, coverImageUrl: true },
      })
    ]);

    // For related themes, just pick some popular ones from the same games
    const relatedThemesCount: Record<string, number> = {};
    const gamesWithTheme = await prisma.game.findMany({
      where: { themes: { contains: exactTheme } },
      select: { themes: true },
      take: 50
    });
    
    for (const g of gamesWithTheme) {
      if (g.themes) {
        g.themes.split(',').forEach(t => {
          const trimmed = t.trim();
          if (trimmed && trimmed !== exactTheme) {
            relatedThemesCount[trimmed] = (relatedThemesCount[trimmed] || 0) + 1;
          }
        });
      }
    }
    
    const relatedThemes = Object.entries(relatedThemesCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 6);

    // Return the same shape as genre so we can reuse the frontend types
    const result = {
      genre: exactTheme,
      gameCount,
      topGames,
      relatedGenres: relatedThemes
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
