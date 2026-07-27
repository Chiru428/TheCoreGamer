import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20,
      100
    );

    const [notifications, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where: { userId: session!.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.inAppNotification.count({
        where: { userId: session!.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json(successResponse({ notifications, unreadCount }));
  } catch (err) {
    captureError(err, { route: "GET /api/user/notifications/inbox" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();

    if (body.markAllRead === true) {
      await prisma.inAppNotification.updateMany({
        where: { userId: session!.user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json(successResponse(null, "All marked as read"));
    }

    if (body.id && typeof body.id === "string") {
      await prisma.inAppNotification.updateMany({
        where: { id: body.id, userId: session!.user.id },
        data: { isRead: true },
      });
      return NextResponse.json(successResponse(null, "Marked as read"));
    }

    return NextResponse.json(errorResponse("Provide markAllRead or id"), { status: 400 });
  } catch (err) {
    captureError(err, { route: "PATCH /api/user/notifications/inbox" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(errorResponse("Notification ID is required"), { status: 400 });
    }

    await prisma.inAppNotification.deleteMany({
      where: { id, userId: session!.user.id },
    });
    
    return NextResponse.json(successResponse(null, "Deleted"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/user/notifications/inbox" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
