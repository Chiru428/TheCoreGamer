import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { logger } from "@/lib/logger";

const CACHE_KEY = "series:list:public";
const CACHE_TTL = 600;

/**
 * GET /api/series — public, cached 600s.
 *
 * Lists all series that have at least one PUBLISHED entry, with articleCount
 * reflecting only published entries. This is the public counterpart to
 * GET /api/admin/series (which is role-gated and includes unpublished/draft
 * series for editorial purposes). Added to fix /series (the public index
 * page), which was previously calling the admin-gated endpoint and always
 * getting a 401 on every request.
 */
export async function GET() {
  try {
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return NextResponse.json(successResponse(cached));
  } catch (err) {
    logger.warn({ err }, "Cache read failed");
  }

  try {
    const series = await withRetry(() =>
      prisma.articleSeries.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          Author: { select: { displayName: true } },
          Entries: {
            select: { Article: { select: { status: true } } },
          },
        },
      })
    );

    const result = series
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        coverImageUrl: s.coverImageUrl,
        isComplete: s.isComplete,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        authorName: s.Author?.displayName ?? null,
        articleCount: s.Entries.filter((e) => e.Article?.status === "PUBLISHED").length,
      }))
      .filter((s) => s.articleCount > 0);

    try {
      await cacheSet(CACHE_KEY, result, CACHE_TTL);
    } catch (err) {
      logger.warn({ err }, "Cache write failed");
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
