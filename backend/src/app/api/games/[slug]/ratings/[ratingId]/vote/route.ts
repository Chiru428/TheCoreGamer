import { NextRequest, NextResponse, after } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { z } from "zod";
import { csrfProtection } from "@/middleware/csrfProtection";

const voteSchema = z.object({
  value: z.number().refine((v) => v === 1 || v === -1, "Value must be 1 or -1"),
});

type Params = { params: Promise<{ slug: string; ratingId: string }> };

// Now that the frontend toggles optimistically (fast repeated clicks fire
// overlapping requests), two near-simultaneous votes can both read "no
// existing vote" and race to create one. Rather than serialize every vote
// behind a lock, retry on the unique-constraint conflict — by the time we
// retry, the other request's row exists and we toggle/update against it.
async function applyHelpfulVote(
  ratingId: string,
  voterId: string,
  value: number,
  attemptsLeft = 3
): Promise<{ helpfulCount: number; myVote: number | null }> {
  const existing = await prisma.userRatingVote.findUnique({
    where: { userRatingId_voterId: { userRatingId: ratingId, voterId } },
  });

  try {
    let myVote: number | null;
    if (existing) {
      if (existing.value === value) {
        await prisma.$transaction([
          prisma.userRatingVote.delete({ where: { id: existing.id } }),
          prisma.userRating.update({
            where: { id: ratingId },
            data: { helpfulCount: { increment: -existing.value } },
          }),
        ]);
        myVote = null;
      } else {
        await prisma.$transaction([
          prisma.userRatingVote.update({ where: { id: existing.id }, data: { value } }),
          prisma.userRating.update({
            where: { id: ratingId },
            data: { helpfulCount: { increment: value - existing.value } },
          }),
        ]);
        myVote = value;
      }
    } else {
      await prisma.$transaction([
        prisma.userRatingVote.create({ data: { userRatingId: ratingId, voterId, value } }),
        prisma.userRating.update({ where: { id: ratingId }, data: { helpfulCount: { increment: value } } }),
      ]);
      myVote = value;
    }

    const fresh = await prisma.userRating.findUnique({ where: { id: ratingId }, select: { helpfulCount: true } });
    return { helpfulCount: fresh?.helpfulCount ?? 0, myVote };
  } catch (err: any) {
    // P2002 = unique constraint violation (lost the race to create), P2025 =
    // record not found (lost the race to update/delete) — both mean the
    // row's state moved under us, so re-read it and apply the vote again.
    if ((err.code === "P2002" || err.code === "P2025") && attemptsLeft > 0) {
      return applyHelpfulVote(ratingId, voterId, value, attemptsLeft - 1);
    }
    throw err;
  }
}

/**
 * POST /api/games/[slug]/ratings/[ratingId]/vote
 * Mark a rating as helpful (+1) or not helpful (-1).
 * A user can change their vote; voting the same value again removes it.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { slug, ratingId } = await params;
    const { data, error: bodyError } = await validateBody(request, voteSchema);
    if (bodyError) return bodyError;

    const voterId = session!.user.id;

    const rating = await withRetry(() =>
      prisma.userRating.findUnique({
        where: { id: ratingId },
        select: { id: true, userId: true },
      })
    );
    if (!rating) {
      return NextResponse.json(errorResponse("Rating not found"), { status: 404 });
    }
    // Can't vote on your own rating
    if (rating.userId === voterId) {
      return NextResponse.json(errorResponse("Cannot vote on your own rating"), { status: 400 });
    }

    const { helpfulCount, myVote } = await applyHelpfulVote(ratingId, voterId, data.value);

    // Cache-busting doesn't affect this response — deferring it until after
    // it's sent (rather than awaiting it first) is what made the helpful-vote
    // toggle feel slow.
    after(async () => {
      try {
        await cacheDeletePattern(`game:${slug}:ratings:*`);
      } catch {
        /* intentionally empty */
      }
    });

    return NextResponse.json(successResponse({ helpfulCount, myVote }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
