import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

/**
 * GET /api/games/metadata
 * Returns distinct genres and platforms across all games.
 * Used by frontend filter dropdowns and preference settings.
 * Cached for 1 hour.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const cacheKey = "games:metadata";

    try {
      const cached = await cacheGet<{ genres: string[]; platforms: string[] }>(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const games = await withRetry(() =>
      prisma.game.findMany({ select: { genres: true, platforms: true } })
    );

    const genres = [...new Set(games.flatMap((g) => g.genres))].sort();
    const platforms = [...new Set(games.flatMap((g) => g.platforms))].sort();

    const result = { genres, platforms };
    try {
      await cacheSet(cacheKey, result, CACHE_TTL.HOUR);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
