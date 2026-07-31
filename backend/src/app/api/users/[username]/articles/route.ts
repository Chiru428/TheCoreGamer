import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse, serializeArticle } from "@/types";

export const runtime = "nodejs";

const articleCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImageUrl: true,
  contentType: true,
  guideType: true,
  isSponsored: true,
  isLiveBlog: true,
  liveBlogEndedAt: true,
  featured: true,
  isBreaking: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  authorId: true,
  User_Article_authorIdToUser: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  GameReview: {
    select: { reviewScore: true },
  },
};

/**
 * GET /api/users/[username]/articles
 * Paginated list of a staff author's published articles, for the "Articles"
 * tab of the profile modal — separate from the heavy GET /api/users/[username]
 * payload since this needs a real total count and "load more" support.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { username },
        select: { id: true, profileVisibility: true },
      })
    );

    if (!user || user.profileVisibility === "PRIVATE") {
      return NextResponse.json(errorResponse("User not found"), { status: 404 });
    }

    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
    const contentType = request.nextUrl.searchParams.get("contentType");
    const where = { 
      authorId: user.id, 
      status: "PUBLISHED" as const,
      ...(contentType ? { contentType: contentType as any } : {})
    };

    const [articles, total] = await Promise.all([
      withRetry(() =>
        prisma.article.findMany({
          where,
          orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
          skip,
          take: limit,
          select: articleCardSelect,
        })
      ),
      withRetry(() => prisma.article.count({ where })),
    ]);

    return NextResponse.json(
      successResponse(articles.map(serializeArticle), undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err, { route: `GET /api/users/${username}/articles` });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
