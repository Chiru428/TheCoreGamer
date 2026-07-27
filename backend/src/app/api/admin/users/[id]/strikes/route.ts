import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { issueStrikeSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { logModerationAction, issueStrike } from "@/lib/moderation";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, issueStrikeSchema);
    if (error) return error;

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json(errorResponse("User not found"), { status: 404 });

    const { auth } = await import("@/lib/auth");
    const session = await auth();

    const strike = await issueStrike(
      id,
      data.reason,
      data.severity,
      session?.user?.id,
      data.expiresAt ? new Date(data.expiresAt) : null
    );
    await logModerationAction({
      action: "ISSUE_STRIKE",
      targetType: "USER",
      targetId: id,
      moderatorId: session?.user?.id,
      reason: data.reason,
    });

    return NextResponse.json(successResponse(strike, "Strike issued"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
