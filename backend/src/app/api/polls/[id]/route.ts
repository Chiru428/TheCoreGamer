import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole, requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern, cacheDelete } from "@/lib/redis";
import { updatePollSchema } from "@/validators";
import { csrfProtection } from "@/middleware/csrfProtection";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/polls/[id]
 * Get a single poll with vote counts and current user's vote.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    let viewerId: string | null = null;
    const viewerSessionId = request.cookies.get("poll_session")?.value ?? null;
    try {
      const { session } = await requireAuth();
      viewerId = session?.user?.id ?? null;
    } catch {
      /* intentionally empty */
    }

    const [poll, customVotes] = await withRetry(() =>
      Promise.all([
        prisma.poll.findUnique({
          where: { id },
          include: {
            Options: { orderBy: { id: "asc" } },
            Votes: {
              where: viewerId
                ? { userId: viewerId }
                : viewerSessionId
                  ? { sessionId: viewerSessionId }
                  : { id: "NEVER_MATCH" },
              select: { optionId: true },
            },
          },
        }),
        prisma.pollVote.findMany({
          where: { pollId: id, customText: { not: null } },
          select: { optionId: true, customText: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ])
    );

    if (!poll) {
      return NextResponse.json(errorResponse("Poll not found"), { status: 404 });
    }

    return NextResponse.json(
      successResponse({
        ...poll,
        totalVotes: poll.voterCount,
        userVotes: poll.Votes.map((v) => v.optionId),
        publicCustomAnswers: customVotes,
        Votes: undefined,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * PUT /api/polls/[id]
 * Update poll metadata (question, expiresAt, isActive). EDITOR/ADMIN only.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const { data, error } = await validateBody(request, updatePollSchema);
    if (error) return error;

    const poll = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        // Clear existing poll in the same slot before assigning
        if (data.homepageSlot != null) {
          await tx.poll.updateMany({
            where: { homepageSlot: data.homepageSlot, NOT: { id } },
            data: { homepageSlot: null },
          });
        }
        return tx.poll.update({
          where: { id },
          data: {
            question: data.question,
            isActive: data.isActive,
            expiresAt: data.expiresAt !== undefined
              ? (data.expiresAt ? new Date(data.expiresAt) : null)
              : undefined,
            ...(data.homepageSlot !== undefined && { homepageSlot: data.homepageSlot }),
          },
          include: { Options: true },
        });
      })
    );

    try {
      await Promise.all([
        cacheDeletePattern("polls:list:*"),
        cacheDelete("homepage:data"),
      ]);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse({ ...poll, totalVotes: poll.voterCount }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * DELETE /api/polls/[id]
 * Soft-close (deactivate) or hard-delete a poll. ADMIN only.
 * Query: ?hard=true for permanent deletion.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const hard = request.nextUrl.searchParams.get("hard") === "true";

    if (hard) {
      await withRetry(() => prisma.poll.delete({ where: { id } }));
    } else {
      await withRetry(() => prisma.poll.update({ where: { id }, data: { isActive: false } }));
    }

    try {
      await Promise.all([
        cacheDeletePattern("polls:list:*"),
        cacheDelete("homepage:data"),  // bust homepage so a closed/deleted slot-poll is no longer shown
      ]);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(null, hard ? "Poll deleted" : "Poll closed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
