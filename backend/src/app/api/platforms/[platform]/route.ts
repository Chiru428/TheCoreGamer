import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";

const VALID_PLATFORMS = ["ps5", "xbox-series-x", "nintendo-switch", "pc", "ios", "android"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(errorResponse("Invalid platform"), { status: 404 });
    }

    const cacheKey = `platforms:${platform}`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    // Map platform slug to DB value convention if needed, or assume exact match if valid.
    // In many DBs 'pc' is 'PC', 'ps5' is 'PlayStation 5' or 'PS5'. Let's search using case-insensitive if possible, 
    // or just the raw slug if that's what's stored. Looking at standard IGDB naming, 
    // we should match the display name or just use the DB array values. 
    // Wait, the prompt says "VALID PLATFORM SLUGS: ps5 | xbox-series-x | nintendo-switch | pc | ios | android"
    // Usually we might need a mapping, but for now we search for games where platforms hasSome matching the string case-insensitively, 
    // or we map it. Let's map it based on typical IGDB names:
    const platformDisplayMap: Record<string, string[]> = {
      "ps5": ["PlayStation 5", "PS5"],
      "xbox-series-x": ["Xbox Series X|S", "Xbox Series X", "Xbox Series S"],
      "nintendo-switch": ["Nintendo Switch", "Switch"],
      "pc": ["PC", "Microsoft Windows"],
      "ios": ["iOS"],
      "android": ["Android"]
    };
    
    const platformNames = platformDisplayMap[platform] || [platform];

    const [gameCount, topGames, upcomingGames, rawArticles] = await Promise.all([
      prisma.game.count({
        where: { platforms: { hasSome: platformNames } }
      }),
      prisma.game.findMany({
        where: { platforms: { hasSome: platformNames } },
        orderBy: [
          { avgUserScore: { sort: 'desc', nulls: 'last' } },
          { totalRating: { sort: 'desc', nulls: 'last' } }
        ],
        take: 12,
        select: { id: true, slug: true, title: true, coverImageUrl: true },
      }),
      prisma.game.findMany({
        where: {
          platforms: { hasSome: platformNames },
          releaseDate: { gt: new Date().toISOString() } // Simple future check assuming YYYY-MM-DD
        },
        orderBy: { releaseDate: 'asc' },
        take: 4,
        select: { id: true, slug: true, title: true, coverImageUrl: true, releaseDate: true },
      }),
      // Only id/slug/title/contentType/featuredImageUrl/publishedAt/author.displayName
      // are ever rendered on the platform page's "Latest News" cards.
      prisma.article.findMany({
        where: {
          status: 'PUBLISHED',
          Game: {
            some: { platforms: { hasSome: platformNames } }
          }
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: {
          id: true, slug: true, title: true, contentType: true, guideType: true,
          featuredImageUrl: true, publishedAt: true,
          User_Article_authorIdToUser: { select: { displayName: true } },
        },
      })
    ]);

    const latestArticles = rawArticles.map(serializeArticle);

    const result = {
      platform,
      gameCount,
      topGames,
      latestArticles,
      upcomingGames
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
