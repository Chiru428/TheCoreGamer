import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "READ");
    if (rl) return rl;

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const session = authCheck.session!;

    const strikes = await prisma.userStrike.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        reason: true,
        severity: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(successResponse(strikes));
  } catch (err) {
    captureError(err, { route: "GET /api/user/strikes" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
