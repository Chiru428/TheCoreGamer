import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** GET /api/series/[slug] — public, cached 600s */
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  const cacheKey = `series:${slug}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(successResponse(cached));
  } catch (err) {
    logger.warn({ err }, "Cache read failed");
  }

  try {
    const series = await withRetry(() =>
      prisma.articleSeries.findUnique({
        where: { slug },
        include: {
          Author: { select: { displayName: true, username: true } },
          Entries: {
            include: {
              Article: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  excerpt: true,
                  featuredImageUrl: true,
                  publishedAt: true,
                  contentType: true,
                  content: true,
                  status: true,
                },
              },
            },
            orderBy: { position: "asc" },
          },
        },
      })
    );

    if (!series) {
      return NextResponse.json(errorResponse("Series not found"), { status: 404 });
    }

    const result = {
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description,
      coverImageUrl: series.coverImageUrl,
      isComplete: series.isComplete,
      createdAt: series.createdAt,
      author: series.Author
        ? { displayName: series.Author.displayName, username: series.Author.username }
        : null,
      entries: series.Entries.filter(
        (e) => e.Article && e.Article.status === "PUBLISHED"
      ).map((e) => ({
        id: e.id,
        position: e.position,
        displayTitle: e.displayTitle,
        article: {
          id: e.Article!.id,
          title: e.Article!.title,
          slug: e.Article!.slug,
          excerpt: e.Article!.excerpt,
          featuredImageUrl: e.Article!.featuredImageUrl,
          publishedAt: e.Article!.publishedAt,
          contentType: e.Article!.contentType,
        },
      })),
    };

    try {
      await cacheSet(cacheKey, result, 600);
    } catch (err) {
      logger.warn({ err }, "Cache write failed");
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
