import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rl = await rateLimit(request, "WRITE");
    if (rl) return rl;

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const session = authCheck.session!;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { sessionVersion: { increment: 1 } },
      }),
      prisma.userDevice.updateMany({
        where: { userId: session.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      successResponse(null, "All sessions revoked. You'll also need to sign out on this device.")
    );
  } catch (err) {
    captureError(err, { route: "POST /api/user/sessions/revoke-all" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
