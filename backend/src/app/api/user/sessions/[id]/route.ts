import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rl = await rateLimit(request, "WRITE");
    if (rl) return rl;

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const session = authCheck.session!;

    const { id } = await params;

    const updated = await prisma.userDevice.updateMany({
      where: { id, userId: session.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (updated.count === 0) {
      return NextResponse.json(errorResponse("Device not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(null, "Device signed out"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/user/sessions/[id]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
