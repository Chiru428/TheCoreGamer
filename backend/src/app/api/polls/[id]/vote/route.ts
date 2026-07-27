import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { castPollVoteSchema } from "@/validators";
import { csrfProtection } from "@/middleware/csrfProtection";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/polls/[id]/vote
 * Cast a vote on one or more poll options.
 * Works for both authenticated (userId) and anonymous (sessionId) users.
 * Body: { optionIds: string[], sessionId?: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const { data, error } = await validateBody(request, castPollVoteSchema);
    if (error) return error;

    // Resolve identity: prefer auth session, fall back to sessionId
    let userId: string | null = null;
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch {
      /* intentionally empty */
    }

    const sessionId = !userId && data.sessionId ? data.sessionId : null;

    if (!userId && !sessionId) {
      return NextResponse.json(errorResponse("Anonymous votes require a sessionId"), {
        status: 400,
      });
    }

    // Verify poll exists and is active
    const poll = await withRetry(() =>
      prisma.poll.findUnique({
        where: { id },
        select: {
          id: true,
          isActive: true,
          expiresAt: true,
          allowMultiple: true,
          Options: { select: { id: true } },
        },
      })
    );

    if (!poll) {
      return NextResponse.json(errorResponse("Poll not found"), { status: 404 });
    }
    if (!poll.isActive) {
      return NextResponse.json(errorResponse("This poll is closed"), { status: 400 });
    }
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      return NextResponse.json(errorResponse("This poll has expired"), { status: 400 });
    }
    if (!poll.allowMultiple && data.optionIds.length > 1) {
      return NextResponse.json(errorResponse("This poll only allows one selection"), {
        status: 400,
      });
    }
    const optionIds = [...new Set(data.optionIds)];
    const validOptionIds = new Set(poll.Options.map((o) => o.id));
    if (!optionIds.every((optId) => validOptionIds.has(optId))) {
      return NextResponse.json(errorResponse("Option not found in this poll"), { status: 400 });
    }

    // Check for duplicate vote (one vote action per poll, regardless of option count)
    const existingVote = await withRetry(() =>
      prisma.pollVote.findFirst({
        where: userId ? { pollId: id, userId } : { pollId: id, sessionId },
      })
    );

    if (existingVote) {
      return NextResponse.json(errorResponse("You have already voted on this poll"), {
        status: 409,
      });
    }

    // Record votes, increment per-option counts, and bump the distinct-voter count atomically
    await withRetry(() =>
      prisma.$transaction([
        prisma.pollVote.createMany({
          data: optionIds.map((optionId) => ({
            pollId: id,
            optionId,
            userId: userId ?? undefined,
            sessionId: sessionId ?? undefined,
            customText: data.customText ?? undefined,
          })),
        }),
        prisma.pollOption.updateMany({
          where: { id: { in: optionIds } },
          data: { voteCount: { increment: 1 } },
        }),
        prisma.poll.update({
          where: { id },
          data: { voterCount: { increment: 1 } },
        }),
      ])
    );

    // Return updated poll state
    const [updated, customVotes] = await withRetry(() =>
      Promise.all([
        prisma.poll.findUnique({
          where: { id },
          include: { Options: { orderBy: { id: "asc" } } },
        }),
        prisma.pollVote.findMany({
          where: { pollId: id, customText: { not: null } },
          select: { optionId: true, customText: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ])
    );

    try {
      await cacheDeletePattern("polls:list:*");
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(
      successResponse({
        ...updated,
        totalVotes: updated?.voterCount ?? 0,
        userVotes: optionIds,
        publicCustomAnswers: customVotes,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
