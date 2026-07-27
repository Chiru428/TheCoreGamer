import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));

    if (!body.scheduledAt) {
      return NextResponse.json(errorResponse("scheduledAt is required"), { status: 400 });
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json(errorResponse("scheduledAt must be a valid future date"), {
        status: 400,
      });
    }

    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    await prisma.article.update({
      where: { id: article.id },
      data: {
        status: "APPROVED", // Schedule places it in APPROVED status
        scheduledAt: scheduledAt,
        editorId: session!.user.id,
      },
    });

    try {
      const { cacheDeletePattern } = await import("@/lib/redis");
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Article scheduled"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
