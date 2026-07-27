import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * GET /api/users/[username]/summary
 * Lightweight public profile stats for hover cards — avoids the heavy
 * article/rating/comment/bookmark payload of GET /api/users/[username].
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const cacheKey = `profile-summary:${username}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          profileVisibility: true,
          bio: true,
          authorBio: true,
          expertise: true,
          twitterHandle: true,
          linkedinUrl: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(errorResponse("User not found"), { status: 404 });
    }

    const isStaff = ["AUTHOR", "EDITOR", "ADMIN"].includes(user.role);

    const [commentStats, reviewsCount, articlesCount, distinctTypes] = await Promise.all([
      withRetry(() =>
        prisma.comment.aggregate({
          where: { authorId: user.id, status: "APPROVED" },
          _count: { _all: true },
          _sum: { upvotes: true },
        })
      ),
      withRetry(() => prisma.userRating.count({ where: { userId: user.id } })),
      isStaff
        ? withRetry(() => prisma.article.count({ where: { authorId: user.id, status: "PUBLISHED" } }))
        : Promise.resolve(0),
      isStaff
        ? withRetry(() => prisma.article.findMany({
            where: { authorId: user.id, status: "PUBLISHED" },
            distinct: ['contentType'],
            select: { contentType: true }
          }))
        : Promise.resolve([]),
    ]);

    const summary = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isStaff,
      profileVisibility: user.profileVisibility || "PUBLIC",
      bio: user.authorBio || user.bio || null,
      expertise: user.expertise,
      twitterHandle: user.twitterHandle,
      linkedinUrl: user.linkedinUrl,
      commentsCount: commentStats._count._all,
      likesCount: commentStats._sum.upvotes ?? 0,
      reviewsCount,
      articlesCount,
      availableContentTypes: (distinctTypes as any[]).map(t => t.contentType),
    };

    try {
      await cacheSet(cacheKey, summary, CACHE_TTL.SHORT);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(summary));
  } catch (err) {
    captureError(err, { route: `GET /api/users/${username}/summary` });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
