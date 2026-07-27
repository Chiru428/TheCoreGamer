import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

const addItemSchema = z
  .object({
    articleId: z.string().min(1).optional(),
    gameId: z.string().min(1).optional(),
  })
  .refine((data) => !!data.articleId || !!data.gameId, {
    message: "Either articleId or gameId is required",
  });

const reorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const { data, error: validationError } = await validateBody(request, addItemSchema);
    if (validationError) return validationError;

    const list = await withRetry(() => prisma.readingList.findUnique({ where: { id } }));
    if (!list || list.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const existing = await withRetry(() =>
      prisma.readingListItem.findFirst({
        where: {
          listId: id,
          ...(data.articleId ? { articleId: data.articleId } : {}),
          ...(data.gameId ? { gameId: data.gameId } : {}),
        },
      })
    );
    if (existing) {
      return NextResponse.json(successResponse(existing, "Item already in list"));
    }

    const maxPosition = await withRetry(() =>
      prisma.readingListItem.aggregate({
        where: { listId: id },
        _max: { position: true },
      })
    );

    const item = await withRetry(() =>
      prisma.readingListItem.create({
        data: {
          listId: id,
          articleId: data.articleId,
          gameId: data.gameId,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      })
    );

    return NextResponse.json(successResponse(item, "Item added"), { status: 201 });
  } catch (err) {
    captureError(err, { route: "POST /api/user/lists/[id]/items" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const { data, error: validationError } = await validateBody(request, reorderSchema);
    if (validationError) return validationError;

    const list = await withRetry(() => prisma.readingList.findUnique({ where: { id } }));
    if (!list || list.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const items = await withRetry(() => prisma.readingListItem.findMany({ where: { listId: id } }));
    const validIds = new Set(items.map((i) => i.id));
    if (data.order.length !== items.length || !data.order.every((itemId) => validIds.has(itemId))) {
      return NextResponse.json(errorResponse("Invalid item order"), { status: 400 });
    }

    await withRetry(() =>
      prisma.$transaction(
        data.order.map((itemId, index) =>
          prisma.readingListItem.update({ where: { id: itemId }, data: { position: index } })
        )
      )
    );

    return NextResponse.json(successResponse({ reordered: true }));
  } catch (err) {
    captureError(err, { route: "PATCH /api/user/lists/[id]/items" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
