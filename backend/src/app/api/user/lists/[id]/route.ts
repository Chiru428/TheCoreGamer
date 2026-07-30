import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";

export const runtime = "nodejs";

const updateListSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});

const GAME_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  releaseDate: true,
  platforms: true,
  genres: true,
} as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const list = await withRetry(() =>
      prisma.readingList.findUnique({
        where: { id },
        include: {
          Items: {
            orderBy: { position: "asc" },
            include: {
              Article: {
                include: {
                  User_Article_authorIdToUser: {
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                  },
                  ArticleTag: { include: { Tag: true } },
                },
              },
              Game: { select: GAME_SELECT },
            },
          },
        },
      })
    );

    if (!list || list.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const { Items, ...listRest } = list;
    const items = Items.map((item) => {
      const { Article, Game, ...rest } = item;
      return {
        ...rest,
        article: Article ? serializeArticle(Article) : null,
        game: Game,
      };
    });

    return NextResponse.json(successResponse({ ...listRest, items }));
  } catch (err) {
    captureError(err, { route: "GET /api/user/lists/[id]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const { data, error: validationError } = await validateBody(request, updateListSchema);
    if (validationError) return validationError;

    const existing = await withRetry(() => prisma.readingList.findUnique({ where: { id } }));
    if (!existing || existing.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    const list = await withRetry(() =>
      prisma.readingList.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        },
      })
    );

    return NextResponse.json(successResponse(list, "List updated"));
  } catch (err) {
    captureError(err, { route: "PUT /api/user/lists/[id]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const existing = await withRetry(() => prisma.readingList.findUnique({ where: { id } }));
    if (!existing || existing.userId !== session!.user.id) {
      return NextResponse.json(errorResponse("List not found"), { status: 404 });
    }

    await withRetry(() => prisma.readingList.delete({ where: { id } }));

    return NextResponse.json(successResponse({ deleted: true }, "List deleted"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/user/lists/[id]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
