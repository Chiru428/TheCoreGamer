import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/middleware/rateLimit";
import { withRetry } from "@/lib/withRetry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Owner = the primary author (Article.authorId) OR a co-author credited via the
// ArticleAuthor byline table — bylines are credit AND access, not just display.
function isArticleOwner(article: { authorId: string; ArticleAuthor: { userId: string }[] }, userId: string) {
  return article.authorId === userId || article.ArticleAuthor.some((a) => a.userId === userId);
}

// GET /api/posts/[slug]/autosave
// Returns the current autosave state for an article
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        select: {
          id: true,
          authorId: true,
          autosaveContent: true,
          autosavedAt: true,
          updatedAt: true,
          ArticleAuthor: { select: { userId: true } },
        },
      })
    );

    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const isOwner = isArticleOwner(article, session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);

    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    return NextResponse.json(
      successResponse({
        autosaveContent: article.autosaveContent,
        autosavedAt: article.autosavedAt,
        updatedAt: article.updatedAt,
      })
    );
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// PATCH /api/posts/[slug]/autosave
// Updates the autosave state without affecting the main content or status
export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    // Custom rate limit for autosave (1 req / 10s per slug)
    // For now using the standard WRITE rate limit which might be tighter
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        select: { id: true, authorId: true, ArticleAuthor: { select: { userId: true } } },
      })
    );

    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const isOwner = isArticleOwner(article, session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);

    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const { content, savedAt } = await request.json();

    if (!content) {
      return NextResponse.json(errorResponse("Content required"), { status: 400 });
    }

    await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          autosaveContent: content,
          autosavedAt: savedAt ? new Date(savedAt) : new Date(),
        },
      })
    );

    return NextResponse.json(successResponse({ success: true }));
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// DELETE /api/posts/[slug]/autosave
// Clears the autosave content (e.g. after manual save or discarding)
export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        select: { id: true, authorId: true, ArticleAuthor: { select: { userId: true } } },
      })
    );

    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const isOwner = isArticleOwner(article, session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);

    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          autosaveContent: null as any,
          autosavedAt: null,
        },
      })
    );

    return NextResponse.json(successResponse({ success: true }));
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
