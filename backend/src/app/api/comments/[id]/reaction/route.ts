import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit, getClientIp } from "@/middleware/rateLimit";
import { commentReactionSchema, COMMENT_REACTION_TYPES } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getReactionState(commentId: string, userId?: string, sessionId?: string) {
  const reactions = await withRetry(() =>
    prisma.commentReaction.groupBy({
      by: ["type"],
      where: { commentId },
      _count: { type: true },
    })
  );

  const counts: Record<string, number> = {};
  for (const type of COMMENT_REACTION_TYPES) counts[type] = 0;
  for (const r of reactions) counts[r.type] = r._count.type;

  const userReactions = await withRetry(() =>
    prisma.commentReaction.findMany({
      where: { commentId, ...(userId ? { userId } : { sessionId }) },
      select: { type: true },
    })
  );

  return { reactions: counts, userReactions: userReactions.map((r) => r.type) };
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, commentReactionSchema);
    if (error) return error;

    const { id } = await params;
    const comment = await withRetry(() => prisma.comment.findUnique({ where: { id } }));
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    const session = await auth();
    const userId = session?.user?.id;

    let sessionId: string | undefined;
    if (!userId) {
      const ip = getClientIp(request);
      const ua = request.headers.get("user-agent") || "";
      sessionId = crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 32);
    }

    const existing = await withRetry(() =>
      prisma.commentReaction.findFirst({
        where: { commentId: id, type: data.type, ...(userId ? { userId } : { sessionId }) },
      })
    );

    if (existing) {
      await withRetry(() => prisma.commentReaction.delete({ where: { id: existing.id } }));
    } else {
      await withRetry(() =>
        prisma.commentReaction.create({
          data: { commentId: id, type: data.type, userId, sessionId },
        })
      );
    }

    const state = await getReactionState(id, userId, sessionId);
    return NextResponse.json(successResponse(state));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
