import { NextRequest, NextResponse, after } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet, cacheDeletePattern } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { createUserRatingSchema } from "@/validators";
import { csrfProtection } from "@/middleware/csrfProtection";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/games/[slug]/ratings
 * Returns paginated community ratings + aggregate stats for a game.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams, 10, 50);

    // Sort modes for the community-ratings tabs (default: most helpful)
    const sortParam = searchParams.get("sort") ?? "helpful";
    const orderBy =
      sortParam === "recent"
        ? [{ createdAt: "desc" as const }]
        : sortParam === "highest"
          ? [{ score: "desc" as const }, { createdAt: "desc" as const }]
          : sortParam === "lowest"
            ? [{ score: "asc" as const }, { createdAt: "desc" as const }]
            : [{ helpfulCount: "desc" as const }, { createdAt: "desc" as const }];

    // Determine if current user is authenticated (to return their vote)
    let viewerId: string | null = null;
    try {
      const { session } = await requireAuth();
      viewerId = session?.user?.id ?? null;
    } catch {
      /* intentionally empty */
    }

    const cacheKey = `game:${slug}:ratings:p${page}:l${limit}`;

    // Aggregate is always calculated fresh so we don't cache it with the user-specific vote data
    const game = await withRetry(() =>
      prisma.game.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    // Aggregate stats (cache separately)
    const aggKey = `game:${slug}:ratings:agg`;
    let aggregate: {
      averageScore: number;
      totalRatings: number;
      distribution: Record<string, number>;
    } | null = null;

    try {
      aggregate = await cacheGet(aggKey);
    } catch {
      /* intentionally empty */
    }

    if (!aggregate) {
      const allScores = await withRetry(() =>
        prisma.userRating.findMany({
          where: { gameId: game.id },
          select: { score: true },
        })
      );

      const total = allScores.length;
      const averageScore = total > 0 ? allScores.reduce((s, r) => s + r.score, 0) / total : 0;
      const distribution = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          String(i + 1),
          allScores.filter((r) => r.score === i + 1).length,
        ])
      );

      aggregate = { averageScore, totalRatings: total, distribution };
      try {
        await cacheSet(aggKey, aggregate, CACHE_TTL.MEDIUM);
      } catch {
        /* intentionally empty */
      }
    }

    // Paginated ratings
    const [ratings, totalRatings] = await withRetry(() =>
      Promise.all([
        prisma.userRating.findMany({
          where: { gameId: game.id },
          include: {
            User: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            Votes: viewerId ? { where: { voterId: viewerId }, select: { value: true } } : false,
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.userRating.count({ where: { gameId: game.id } }),
      ])
    );

    // Attach viewer's own vote result and find their rating
    const ratingsWithVote = ratings.map((r) => ({
      ...r,
      user: r.User,
      User: undefined,
      myVote: r.Votes && r.Votes.length > 0 ? r.Votes[0].value : null,
      Votes: undefined, // strip raw votes from response
    }));

    // Find viewer's own rating (to show edit form)
    let userRating = null;
    if (viewerId) {
      const rawUserRating = await withRetry(() =>
        prisma.userRating.findUnique({
          where: { userId_gameId: { userId: viewerId!, gameId: game.id } },
          include: {
            User: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        })
      );
      if (rawUserRating) {
        userRating = {
          ...rawUserRating,
          user: rawUserRating.User,
          User: undefined,
        };
      }
    }

    return NextResponse.json(
      successResponse(
        {
          ratings: ratingsWithVote,
          aggregate: { ...aggregate, userRating },
        },
        undefined,
        buildPaginationMeta(page, limit, totalRatings)
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * POST /api/games/[slug]/ratings
 * Create or update the authenticated user's rating for a game.
 * Body: { score: 1-10, body?: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { slug } = await params;
    const { data, error: bodyError } = await validateBody(request, createUserRatingSchema);
    if (bodyError) return bodyError;

    const game = await withRetry(() =>
      prisma.game.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    const userId = session!.user.id;

    const rating = await withRetry(() =>
      prisma.userRating.upsert({
        where: { userId_gameId: { userId, gameId: game.id } },
        create: { userId, gameId: game.id, score: data.score, body: data.body ?? null },
        update: { score: data.score, body: data.body ?? null },
        include: {
          User: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      })
    );

    const mappedRating = {
      ...rating,
      user: rating.User,
      User: undefined,
    };

    // Recomputing the game's average score and busting the ratings cache
    // don't affect this response — running them after the response is sent
    // (rather than awaiting several sequential DB/Redis round trips first)
    // is what was making "Post review" feel slow.
    after(async () => {
      try {
        await cacheDeletePattern(`game:${slug}:ratings:*`);
      } catch {
        /* intentionally empty */
      }
    });

    return NextResponse.json(successResponse(mappedRating, "Rating saved"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * DELETE /api/games/[slug]/ratings
 * Remove the authenticated user's rating.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { slug } = await params;

    const game = await withRetry(() =>
      prisma.game.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    await withRetry(() =>
      prisma.userRating.deleteMany({
        where: { userId: session!.user.id, gameId: game.id },
      })
    );

    try {
      await cacheDeletePattern(`game:${slug}:ratings:*`);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(null, "Rating removed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
