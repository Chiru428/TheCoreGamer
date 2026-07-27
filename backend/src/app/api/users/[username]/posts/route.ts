import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/users/[username]/posts
 * Paginated list of a user's approved comments, for the "Posts" tab of the
 * profile modal — separate from the heavy GET /api/users/[username] payload
 * since this needs a real total count and "load more" support.
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
    const where = { authorId: user.id, status: "APPROVED" as const };

    const [comments, total] = await Promise.all([
      withRetry(() =>
        prisma.comment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            body: true,
            gifUrl: true,
            createdAt: true,
            Article: { select: { title: true, slug: true, contentType: true, featuredImageUrl: true } },
          },
        })
      ),
      withRetry(() => prisma.comment.count({ where })),
    ]);

    const posts = comments.map((c) => ({
      id: c.id,
      body: c.body,
      gifUrl: c.gifUrl,
      createdAt: c.createdAt,
      articleTitle: c.Article.title,
      articleSlug: c.Article.slug,
      articleContentType: c.Article.contentType,
      articleFeaturedImageUrl: c.Article.featuredImageUrl,
    }));

    return NextResponse.json(
      successResponse(posts, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err, { route: `GET /api/users/${username}/posts` });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
