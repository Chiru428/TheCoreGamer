import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

/** POST /api/user/unlink-provider — disconnect the linked OAuth provider */
export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rl = await rateLimit(request, "WRITE");
    if (rl) return rl;

    const { session, error } = await requireAuth(request);
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { oauthProvider: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(errorResponse("User not found"), { status: 401 });
    }

    if (!user.oauthProvider) {
      return NextResponse.json(errorResponse("No linked provider to disconnect"), {
        status: 400,
      });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        errorResponse("Set a password first or the account would become unreachable"),
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id: session!.user.id },
      data: { oauthProvider: null, oauthId: null },
    });

    return NextResponse.json(
      successResponse(null, `${user.oauthProvider} account disconnected`)
    );
  } catch (err) {
    captureError(err, { route: "POST /api/user/unlink-provider" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
