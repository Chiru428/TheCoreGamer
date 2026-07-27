import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";

export const runtime = "nodejs";

const toggleSchema = z.object({ articleId: z.string().min(1) });

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const bookmarks = await withRetry(() =>
      prisma.bookmark.findMany({
        where: { userId: session!.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          Article: {
            include: {
              User_Article_authorIdToUser: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
              ArticleTag: { include: { Tag: true } },
              _count: {
                select: {
                  Comment: { where: { status: "APPROVED" } },
                  ArticleReaction: { where: { type: "LIKE" } },
                },
              },
            },
          },
        },
      })
    );

    const normalizedBookmarks = bookmarks.map((b) => {
      const { Article, ...rest } = b as any;
      return {
        ...rest,
        article: Article ? serializeArticle(Article) : null,
      };
    });

    return NextResponse.json(successResponse(normalizedBookmarks));
  } catch (err) {
    captureError(err, { route: "GET /api/bookmarks" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: validationError } = await validateBody(request, toggleSchema);
    if (validationError) return validationError;

    const existing = await withRetry(() =>
      prisma.bookmark.findUnique({
        where: { userId_articleId: { userId: session!.user.id, articleId: data.articleId } },
      })
    );

    if (existing) {
      await withRetry(() => prisma.bookmark.delete({ where: { id: existing.id } }));
      return NextResponse.json(successResponse({ bookmarked: false }, "Bookmark removed"));
    }

    const bookmark = await withRetry(() =>
      prisma.bookmark.create({
        data: { userId: session!.user.id, articleId: data.articleId },
      })
    );

    return NextResponse.json(successResponse({ bookmarked: true, id: bookmark.id }, "Bookmarked"), {
      status: 201,
    });
  } catch (err) {
    captureError(err, { route: "POST /api/bookmarks" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
