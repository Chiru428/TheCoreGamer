import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET() {
  try {
    const cacheKey = `guides:facets:v1`;

    try {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    } catch (err) {}

    // Guide Types — dynamic, pulled from all published guides
    const guideTypeQuery = prisma.$queryRaw`
      SELECT "guideType" as value, count(*)::int as count
      FROM "Article"
      WHERE status = 'PUBLISHED' AND "contentType" = 'GUIDE' AND "guideType" IS NOT NULL AND "guideType" != ''
      GROUP BY "guideType"
      ORDER BY count DESC;
    `;

    // Platforms — from games linked to guides via _ArticleGames
    const platformQuery = prisma.$queryRaw`
      SELECT unnest(g.platforms) as value, count(*)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'GUIDE'
      GROUP BY value
      ORDER BY count DESC;
    `;

    // Genres — from games linked to guides
    const genreQuery = prisma.$queryRaw`
      SELECT unnest(g.genres) as value, count(*)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'GUIDE'
      GROUP BY value
      ORDER BY count DESC;
    `;

    // Top games — name + count of guides per game
    const gameQuery = prisma.$queryRaw`
      SELECT g.title as value, g.slug as slug, count(*)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'GUIDE'
      GROUP BY g.id, g.title, g.slug
      ORDER BY count DESC
      LIMIT 20;
    `;

    // Tags — tags applied to guide articles
    const tagQuery = prisma.$queryRaw`
      SELECT t.name as value, count(at."tagId")::int as count
      FROM "ArticleTag" at
      JOIN "Tag" t ON t.id = at."tagId"
      JOIN "Article" a ON a.id = at."articleId"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'GUIDE'
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT 30;
    `;

    const [guideTypes, platforms, genres, games, tags] = await Promise.all([
      guideTypeQuery,
      platformQuery,
      genreQuery,
      gameQuery,
      tagQuery,
    ]);

    const facets = {
      guideTypes: guideTypes || [],
      platforms: platforms || [],
      genres: genres || [],
      games: games || [],
      tags: tags || [],
    };

    try {
      await cacheSet(cacheKey, facets, CACHE_TTL.LONG);
    } catch (err) {}

    return NextResponse.json(successResponse(facets));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
