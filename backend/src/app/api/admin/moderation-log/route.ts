import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");

    const where = targetType ? { targetType } : {};

    const logs = await prisma.moderationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        Moderator: { select: { id: true, username: true, displayName: true } },
      },
    });

    return NextResponse.json(successResponse(logs));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    await prisma.moderationLog.deleteMany({});

    return NextResponse.json(successResponse({ message: "Moderation log cleared successfully" }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
