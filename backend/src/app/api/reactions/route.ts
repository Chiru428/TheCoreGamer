import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit, getClientIp } from "@/middleware/rateLimit";
import { createReactionSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const articleId = request.nextUrl.searchParams.get("articleId");
    if (!articleId)
      return NextResponse.json(errorResponse("articleId is required"), { status: 400 });

    const reactions = await withRetry(() =>
      prisma.articleReaction.groupBy({
        by: ["type"],
        where: { articleId },
        _count: { type: true },
      })
    );

    const counts = reactions.reduce(
      (acc, r) => {
        acc[r.type] = r._count.type;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json(successResponse(counts));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, createReactionSchema);
    if (error) return error;

    const session = await auth();

    if (session?.user) {
      const existing = await withRetry(() =>
        prisma.articleReaction.findFirst({
          where: { articleId: data.articleId, userId: session.user.id, type: data.type },
        })
      );
      if (existing) {
        // deleteMany instead of delete — a near-simultaneous toggle can beat us to
        // removing this same row, and delete-by-id throws P2025 if it's already gone.
        await withRetry(() => prisma.articleReaction.deleteMany({ where: { id: existing.id } }));
        return NextResponse.json(successResponse(null, "Reaction removed"));
      }
      try {
        await withRetry(() =>
          prisma.articleReaction.create({
            data: { articleId: data.articleId, userId: session.user.id, type: data.type },
          })
        );
      } catch (createErr: any) {
        // P2002 = unique constraint violation (race condition / double-click) — treat as success
        if (createErr?.code !== "P2002") throw createErr;
      }
    } else {
      const ip = getClientIp(request);
      const ua = request.headers.get("user-agent") || "";
      const sessionId = crypto
        .createHash("sha256")
        .update(`${ip}:${ua}`)
        .digest("hex")
        .slice(0, 32);

      const existing = await withRetry(() =>
        prisma.articleReaction.findFirst({
          where: { articleId: data.articleId, sessionId, type: data.type },
        })
      );
      if (existing) {
        // deleteMany instead of delete — a near-simultaneous toggle can beat us to
        // removing this same row, and delete-by-id throws P2025 if it's already gone.
        await withRetry(() => prisma.articleReaction.deleteMany({ where: { id: existing.id } }));
        return NextResponse.json(successResponse(null, "Reaction removed"));
      }
      try {
        await withRetry(() =>
          prisma.articleReaction.create({
            data: { articleId: data.articleId, sessionId, type: data.type },
          })
        );
      } catch (createErr: any) {
        // P2002 = unique constraint violation (race condition / double-click) — treat as success
        if (createErr?.code !== "P2002") throw createErr;
      }
    }

    return NextResponse.json(successResponse(null, "Reaction added"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
