import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/users/[username]/reviews
 * Paginated list of a user's game ratings/reviews, for the "Reviews" tab of
 * the profile modal.
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
    const where = { userId: user.id };

    const [ratings, total] = await Promise.all([
      withRetry(() =>
        prisma.userRating.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            score: true,
            body: true,
            createdAt: true,
            Game: { select: { title: true, slug: true, coverImageUrl: true } },
          },
        })
      ),
      withRetry(() => prisma.userRating.count({ where })),
    ]);

    const reviews = ratings.map((r) => ({
      id: r.id,
      score: r.score,
      body: r.body,
      createdAt: r.createdAt,
      gameTitle: r.Game.title,
      gameSlug: r.Game.slug,
      gameCoverImageUrl: r.Game.coverImageUrl,
    }));

    return NextResponse.json(
      successResponse(reviews, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err, { route: `GET /api/users/${username}/reviews` });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
