import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Now that the frontend toggles optimistically (fast repeated clicks fire
// overlapping requests), two near-simultaneous votes can both read the same
// "existing vote" snapshot and race — e.g. both see no vote and try to
// create one, or both see the same vote and both try to delete it (the
// second delete would 404 inside the transaction). Retry on conflict: by the
// time we retry, the other request's write has landed and we recompute the
// delta against its actual state.
async function applyModGuideVote(
  guideId: string,
  identity: { userId?: string; sessionId?: string },
  value: number,
  attemptsLeft = 3
): Promise<{ helpfulCount: number; notHelpfulCount: number }> {
  const voteWhere = identity.userId
    ? { modGuideId_userId: { modGuideId: guideId, userId: identity.userId } }
    : { modGuideId_sessionId: { modGuideId: guideId, sessionId: identity.sessionId! } };

  const existingVote = await prisma.modGuideVote.findUnique({ where: voteWhere, select: { value: true } });

  try {
    let helpfulDelta = 0;
    let notHelpfulDelta = 0;
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    if (value === 0) {
      if (existingVote) {
        ops.push(prisma.modGuideVote.delete({ where: voteWhere }));
        if (existingVote.value === 1) helpfulDelta = -1;
        else if (existingVote.value === -1) notHelpfulDelta = -1;
      }
    } else {
      ops.push(
        prisma.modGuideVote.upsert({
          where: voteWhere,
          create: identity.userId
            ? { modGuideId: guideId, userId: identity.userId, value }
            : { modGuideId: guideId, sessionId: identity.sessionId!, value },
          update: { value },
        })
      );
      if (!existingVote) {
        if (value === 1) helpfulDelta = 1;
        else notHelpfulDelta = 1;
      } else if (existingVote.value !== value) {
        if (value === 1) {
          helpfulDelta = 1;
          notHelpfulDelta = -1;
        } else {
          helpfulDelta = -1;
          notHelpfulDelta = 1;
        }
      }
    }

    if (helpfulDelta !== 0 || notHelpfulDelta !== 0) {
      ops.push(
        prisma.modGuide.update({
          where: { id: guideId },
          data: {
            ...(helpfulDelta !== 0 && { helpfulCount: { increment: helpfulDelta } }),
            ...(notHelpfulDelta !== 0 && { notHelpfulCount: { increment: notHelpfulDelta } }),
          },
        })
      );
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    const result = await prisma.modGuide.findUniqueOrThrow({
      where: { id: guideId },
      select: { helpfulCount: true, notHelpfulCount: true },
    });
    return {
      helpfulCount: Math.max(0, result.helpfulCount),
      notHelpfulCount: Math.max(0, result.notHelpfulCount),
    };
  } catch (err: any) {
    if ((err.code === "P2002" || err.code === "P2025") && attemptsLeft > 0) {
      return applyModGuideVote(guideId, identity, value, attemptsLeft - 1);
    }
    throw err;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const session = await auth();
    const sessionId = request.headers.get("x-session-id");

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { ModGuide: { select: { id: true, helpfulCount: true, notHelpfulCount: true } } },
    });

    if (!article?.ModGuide) {
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });
    }

    const guide = article.ModGuide;
    let userVote: number | null = null;

    if (session?.user?.id) {
      const vote = await prisma.modGuideVote.findUnique({
        where: { modGuideId_userId: { modGuideId: guide.id, userId: session.user.id } },
        select: { value: true },
      });
      userVote = vote?.value ?? null;
    } else if (sessionId) {
      const vote = await prisma.modGuideVote.findUnique({
        where: { modGuideId_sessionId: { modGuideId: guide.id, sessionId } },
        select: { value: true },
      });
      userVote = vote?.value ?? null;
    }

    return NextResponse.json(
      successResponse({
        helpfulCount: Math.max(0, guide.helpfulCount),
        notHelpfulCount: Math.max(0, guide.notHelpfulCount),
        userVote,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const session = await auth();
    const sessionId = request.headers.get("x-session-id");

    const body = await request.json();
    const value: number = body.value;
    if (value !== 1 && value !== -1 && value !== 0) {
      return NextResponse.json(errorResponse("value must be 1, -1, or 0"), { status: 400 });
    }

    if (!session?.user?.id && !sessionId) {
      return NextResponse.json(errorResponse("Session ID required for anonymous votes"), {
        status: 400,
      });
    }

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { ModGuide: { select: { id: true } } },
    });

    if (!article?.ModGuide) {
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });
    }

    const guideId = article.ModGuide.id;

    const updatedGuide = await applyModGuideVote(
      guideId,
      session?.user?.id ? { userId: session.user.id } : { sessionId: sessionId! },
      value
    );

    return NextResponse.json(
      successResponse({
        helpfulCount: Math.max(0, updatedGuide.helpfulCount),
        notHelpfulCount: Math.max(0, updatedGuide.notHelpfulCount),
        userVote: value === 0 ? null : value,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
