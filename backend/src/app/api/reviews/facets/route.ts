import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET() {
  try {
    const cacheKey = `reviews:facets:v2`;
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    } catch (err) {}

    const platformQuery = prisma.$queryRaw`
      SELECT unnest(platforms) as value, count(*)::int as count
      FROM "GameReview"
      JOIN "Article" ON "Article".id = "GameReview"."articleId"
      WHERE "Article".status = 'PUBLISHED'
      GROUP BY value
      ORDER BY count DESC;
    `;

    const genreQuery = prisma.$queryRaw`
      SELECT unnest(genres) as value, count(*)::int as count
      FROM "GameReview"
      JOIN "Article" ON "Article".id = "GameReview"."articleId"
      WHERE "Article".status = 'PUBLISHED'
      GROUP BY value
      ORDER BY count DESC;
    `;

    const yearQuery = prisma.$queryRaw`
      SELECT EXTRACT(YEAR FROM "releaseDate")::int::text as value, count(*)::int as count
      FROM "GameReview"
      JOIN "Article" ON "Article".id = "GameReview"."articleId"
      WHERE "Article".status = 'PUBLISHED'
      GROUP BY value
      ORDER BY value DESC;
    `;

    const tagQuery = prisma.$queryRaw`
      SELECT t.name as value, count(at."tagId")::int as count
      FROM "ArticleTag" at
      JOIN "Tag" t ON t.id = at."tagId"
      JOIN "Article" a ON a.id = at."articleId"
      WHERE a.status = 'PUBLISHED' AND a."contentType" = 'REVIEW'
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT 30;
    `;

    const [platforms, genres, years, tags] = await Promise.all([platformQuery, genreQuery, yearQuery, tagQuery]);

    const facets = {
      platforms: platforms || [],
      genres: genres || [],
      years: years || [],
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
