import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET() {
  try {
    const cacheKey = `walkthroughs:facets:v1`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    } catch (err) {}

    const platformQuery = prisma.$queryRaw`
      SELECT unnest(g.platforms) as value, count(DISTINCT a.id)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'WALKTHROUGH'
      GROUP BY value
      ORDER BY count DESC;
    `;

    const genreQuery = prisma.$queryRaw`
      SELECT unnest(g.genres) as value, count(DISTINCT a.id)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'WALKTHROUGH'
      GROUP BY value
      ORDER BY count DESC;
    `;

    const gameQuery = prisma.$queryRaw`
      SELECT g.slug as value, g.title as label, count(DISTINCT a.id)::int as count
      FROM "Game" g
      JOIN "_ArticleGames" ag ON ag."B" = g.id
      JOIN "Article" a ON a.id = ag."A"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'WALKTHROUGH'
      GROUP BY g.id, g.slug, g.title
      ORDER BY count DESC;
    `;

    const tagQuery = prisma.$queryRaw`
      SELECT t.slug as value, t.name as label, count(at."tagId")::int as count
      FROM "ArticleTag" at
      JOIN "Tag" t ON t.id = at."tagId"
      JOIN "Article" a ON a.id = at."articleId"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'WALKTHROUGH'
      GROUP BY t.id, t.slug, t.name
      ORDER BY count DESC
      LIMIT 30;
    `;

    const [platforms, genres, games, tags] = await Promise.all([
      platformQuery, 
      genreQuery, 
      gameQuery, 
      tagQuery
    ]);

    const facets = {
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
