import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { castAwardVoteSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ awardId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { awardId } = await params;
    const { data, error } = await validateBody(request, castAwardVoteSchema);
    if (error) return error;

    const award = await prisma.award.findUnique({ where: { id: awardId } });
    if (!award) return NextResponse.json(errorResponse("Award not found"), { status: 404 });
    if (!award.isVotingOpen) return NextResponse.json(errorResponse("Voting is closed for this award"), { status: 403 });

    // Extract user if logged in
    const authCheck = await requireAuth();
    let userId: string | null = null;
    if (!authCheck.error && authCheck.session) {
      userId = authCheck.session.user.id || null;
    }

    const sessionId = data.sessionId || null;
    if (!userId && !sessionId) {
      return NextResponse.json(errorResponse("Must be logged in or provide a session ID to vote"), { status: 400 });
    }

    // Check if vote already exists
    const whereClause: any = { awardId };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.sessionId = sessionId;
    }

    const existingVote = await prisma.awardVote.findFirst({ where: whereClause });
    if (existingVote) {
      // Update existing vote
      await prisma.awardVote.update({
        where: { id: existingVote.id },
        data: { gameId: data.gameId }
      });
    } else {
      // Create new vote
      await prisma.awardVote.create({
        data: {
          awardId,
          userId,
          sessionId: userId ? null : sessionId,
          gameId: data.gameId,
        }
      });
    }

    // Invalidate the cache for the award year
    try {
      await cacheDeletePattern(`awards:${award.year}`);
    } catch (e) {
      console.warn("Failed to delete cache pattern", e);
    }

    // Return the updated vote counts
    const votes = await prisma.awardVote.groupBy({
      by: ["gameId"],
      where: { awardId },
      _count: { _all: true },
    });

    const voteCounts: Record<string, number> = {};
    votes.forEach(v => { voteCounts[v.gameId] = v._count._all; });

    return NextResponse.json(successResponse({ voteCounts }, "Vote recorded"));
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
