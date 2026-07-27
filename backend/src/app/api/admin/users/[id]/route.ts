import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateUserRoleSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { logModerationAction, issueStrike } from "@/lib/moderation";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        lockUntil: true,
        StrikesReceived: {
          orderBy: { issuedAt: "desc" },
          select: {
            id: true,
            reason: true,
            severity: true,
            issuedAt: true,
            expiresAt: true,
            IssuedBy: { select: { displayName: true, username: true } },
          },
        },
        _count: { select: { Article_Article_authorIdToUser: true, Comment: true } },
      },
    });
    if (!user) return NextResponse.json(errorResponse("User not found"), { status: 404 });

    const { StrikesReceived, _count, ...rest } = user;
    const result = {
      ...rest,
      strikes: StrikesReceived,
      _count: {
        articles: _count.Article_Article_authorIdToUser,
        comments: _count.Comment,
      },
    };

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateUserRoleSchema);
    if (error) return error;

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json(errorResponse("User not found"), { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data: { role: data.role },
      select: { id: true, email: true, username: true, role: true },
    });

    return NextResponse.json(successResponse(updated, "User role updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json(errorResponse("User not found"), { status: 404 });

    let reason = "Admin deactivation";
    try {
      const body = await request.json();
      if (body.reason) reason = body.reason;
    } catch {}

    // Deactivate (set role to USER, clear sensitive data)
    await prisma.user.update({
      where: { id },
      data: { role: "USER", passwordHash: null, twoFactorSecret: null, twoFactorEnabled: false },
    });

    const { auth } = await import("@/lib/auth");
    const session = await auth();

    await issueStrike(id, reason, 3, session?.user?.id);
    await logModerationAction({
      action: "BAN_USER",
      targetType: "USER",
      targetId: id,
      moderatorId: session?.user?.id,
      reason: reason,
    });

    return NextResponse.json(successResponse(null, "User deactivated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
