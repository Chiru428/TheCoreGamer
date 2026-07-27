import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) return NextResponse.json(errorResponse("Tag not found"), { status: 404 });

    await prisma.tag.delete({ where: { id } });

    try {
      const { cacheDeletePattern } = await import("@/lib/redis");
      await cacheDeletePattern("tags:*");
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Tag deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
