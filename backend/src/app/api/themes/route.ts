import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const cacheKey = "themes:list";
    
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache read failed");
    }

    const results = await prisma.$queryRaw<{ genre: string; gameCount: number }[]>`
      SELECT trim(unnest(string_to_array(themes, ','))) as genre, count(*)::int as "gameCount"
      FROM "Game"
      WHERE themes IS NOT NULL
      GROUP BY trim(unnest(string_to_array(themes, ',')))
      ORDER BY "gameCount" DESC
    `;

    try {
      await cacheSet(cacheKey, results, CACHE_TTL.LONG);
    } catch (err) {
      logger.warn({ err }, "Cache write failed");
    }

    return NextResponse.json(successResponse(results));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
