import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireAuth } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, itemId } = await params;

    const list = await withRetry(() => prisma.readingList.findUnique({ where: { id } }));
    if (!list || list.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const item = await withRetry(() => prisma.readingListItem.findUnique({ where: { id: itemId } }));
    if (!item || item.listId !== id) {
      return NextResponse.json(errorResponse("Item not found"), { status: 404 });
    }

    await withRetry(() => prisma.readingListItem.delete({ where: { id: itemId } }));

    return NextResponse.json(successResponse({ deleted: true }, "Item removed"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/user/lists/[id]/items/[itemId]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
