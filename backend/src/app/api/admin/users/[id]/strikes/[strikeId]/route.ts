import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { logModerationAction } from "@/lib/moderation";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string; strikeId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id, strikeId } = await params;
    const strike = await prisma.userStrike.findUnique({ where: { id: strikeId } });
    if (!strike || strike.userId !== id) {
      return NextResponse.json(errorResponse("Strike not found"), { status: 404 });
    }

    await prisma.userStrike.delete({ where: { id: strikeId } });

    const { auth } = await import("@/lib/auth");
    const session = await auth();
    await logModerationAction({
      action: "REMOVE_STRIKE",
      targetType: "USER",
      targetId: id,
      moderatorId: session?.user?.id,
      reason: strike.reason,
    });

    return NextResponse.json(successResponse(null, "Strike removed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
