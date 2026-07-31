import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);
    const gameId = searchParams.get("gameId");

    const cacheKey = `videos:list:p${page}:l${limit}${gameId ? `:g${gameId}` : ""}`;

    try {
      const cached = await cacheGet<{ videos: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return NextResponse.json(
          successResponse(cached.videos, undefined, buildPaginationMeta(page, limit, cached.total))
        );
      }
    } catch {
      /* intentionally empty */
    }

    const where: Record<string, unknown> = { status: "ready" };
    if (gameId) {
      where.Article = { Game: { some: { id: gameId } } };
    }

    const [rawVideos, total] = await Promise.all([
      withRetry(() =>
        prisma.videoAsset.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            muxPlaybackId: true,
            aspectRatio: true,
            duration: true,
            createdAt: true,
            Article: {
              select: {
                id: true,
                title: true,
                slug: true,
                contentType: true,
                guideType: true,
                featuredImageUrl: true,
              },
            },
          },
        })
      ),
      withRetry(() => prisma.videoAsset.count({ where })),
    ]);

    const videos = rawVideos.map(({ Article, ...v }) => ({ ...v, article: Article }));
    const pagination = buildPaginationMeta(page, limit, total);

    try {
      await cacheSet(cacheKey, { videos, total }, CACHE_TTL.MEDIUM);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(videos, undefined, pagination));
  } catch (err) {
    captureError(err, { route: "GET /api/videos" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
