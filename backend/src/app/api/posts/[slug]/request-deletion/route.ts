import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { requestArticleDeletionSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Owner = the primary author (Article.authorId) OR a co-author credited via the
// ArticleAuthor byline table — bylines are credit AND access, not just display.
function isArticleOwner(article: { authorId: string; ArticleAuthor: { userId: string }[] }, userId: string) {
  return article.authorId === userId || article.ArticleAuthor.some((a) => a.userId === userId);
}

// POST /api/posts/[slug]/request-deletion
// AUTHOR (or co-author) flags an APPROVED/PUBLISHED/ARCHIVED article for deletion —
// they can't hard-delete those themselves, only DRAFT/IN_REVIEW ones (see DELETE
// /api/posts/[slug]). An EDITOR/ADMIN then fulfils (DELETE) or dismisses the request.
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { slug } = await params;
    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        select: {
          id: true,
          status: true,
          authorId: true,
          deletionRequestedAt: true,
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

    if (article.status === "DRAFT" || article.status === "IN_REVIEW") {
      return NextResponse.json(
        errorResponse("Draft or in-review articles can be deleted directly — no request needed"),
        { status: 400 }
      );
    }

    if (article.deletionRequestedAt) {
      return NextResponse.json(errorResponse("Deletion has already been requested for this article"), {
        status: 400,
      });
    }

    const { data, error } = await validateBody(request, requestArticleDeletionSchema);
    if (error) return error;

    await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          deletionRequestedAt: new Date(),
          deletionRequestedById: session.user.id,
          deletionRequestReason: data.reason,
        },
      })
    );

    try {
      const { cacheDeletePattern } = await import("@/lib/redis");
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Deletion requested — an editor or admin will review it"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// DELETE /api/posts/[slug]/request-deletion
// Withdraws a pending deletion request — callable by the article's owner (to change
// their mind) or an EDITOR/ADMIN (to dismiss the request without deleting).
export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { slug } = await params;
    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        select: {
          id: true,
          authorId: true,
          deletionRequestedAt: true,
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

    if (!article.deletionRequestedAt) {
      return NextResponse.json(errorResponse("No pending deletion request for this article"), {
        status: 400,
      });
    }

    await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: { deletionRequestedAt: null, deletionRequestedById: null, deletionRequestReason: null },
      })
    );

    try {
      const { cacheDeletePattern } = await import("@/lib/redis");
      await cacheDeletePattern("posts:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Deletion request withdrawn"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
