import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { updateArticleSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { generateUniqueSlug } from "@/lib/slug";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";
import { csrfProtection } from "@/middleware/csrfProtection";
import { addSearchIndexJob } from "@/lib/bullmq";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/posts/[slug]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const session = await auth();
    const isPrivileged = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";

    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        include: {
          User_Article_authorIdToUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, authorBio: true, expertise: true },
          },
          User_Article_editorIdToUser: { select: { id: true, username: true, displayName: true } },
          User_Article_deletionRequestedByIdToUser: { select: { id: true, username: true, displayName: true } },
          ArticleTag: { include: { Tag: true } },
          GameReview: {
            include: {
              Game: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  coverImageUrl: true,
                  steamAppId: true,
                },
              },
            },
          },
          ModGuide: { include: { MediaAttachment: true } },
          Game: { select: { id: true, title: true } },
          VideoAsset: {
            where: { status: "ready" },
            select: {
              id: true,
              title: true,
              muxPlaybackId: true,
              aspectRatio: true,
              duration: true,
              transcript: true,
              thumbnailUrl: true,
              createdAt: true,
            },
          },
          Poll: { where: { isActive: true }, take: 3 },
          _count: {
            select: {
              Comment: { where: { status: "APPROVED" } },
              ArticleReaction: { where: { type: "LIKE" } },
            },
          },
          SeriesEntry: {
            include: {
              Series: { select: { id: true, name: true, slug: true } },
            },
          },
          ArticleAuthor: { select: { userId: true } },
        },
      })
    );

    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    // Owner = the primary author (Article.authorId) OR a co-author credited via the
    // ArticleAuthor byline table — bylines are credit AND access, not just display.
    const isOwnArticle =
      !!session?.user?.id &&
      (article.authorId === session.user.id ||
        article.ArticleAuthor.some((a) => a.userId === session.user.id));

    if (!isPrivileged && !isOwnArticle && article.status !== "PUBLISHED") {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    // Build series navigation data if this article belongs to a series
    let seriesEntry = null;
    if (article.SeriesEntry) {
      const entry = article.SeriesEntry;
      const seriesId = entry.seriesId;
      const position = entry.position;

      // Fetch all entries in the series to get total + prev/next
      const allEntries = await withRetry(() =>
        prisma.articleSeriesEntry.findMany({
          where: { seriesId },
          include: {
            Article: {
              select: {
                id: true, title: true, slug: true, featuredImageUrl: true,
                status: true, excerpt: true,
              },
            },
          },
          orderBy: { position: "asc" },
        })
      );

      const published = allEntries.filter(
        (e) => e.Article && (e.Article.status === "PUBLISHED" || isPrivileged)
      );
      const total = published.length;
      const thisIndex = published.findIndex((e) => e.id === entry.id);

      const prevEntry = thisIndex > 0 ? published[thisIndex - 1] : null;
      const nextEntry = thisIndex < total - 1 ? published[thisIndex + 1] : null;

      seriesEntry = {
        series: entry.Series,
        position,
        totalParts: total,
        displayTitle: entry.displayTitle,
        prev: prevEntry?.Article
          ? {
              id: prevEntry.Article.id,
              title: prevEntry.Article.title,
              slug: prevEntry.Article.slug,
              featuredImageUrl: prevEntry.Article.featuredImageUrl,
              position: prevEntry.position,
            }
          : null,
        next: nextEntry?.Article
          ? {
              id: nextEntry.Article.id,
              title: nextEntry.Article.title,
              slug: nextEntry.Article.slug,
              featuredImageUrl: nextEntry.Article.featuredImageUrl,
              position: nextEntry.position,
            }
          : null,
      };
    }

    return NextResponse.json(
      successResponse({ ...serializeArticle(article), seriesEntry })
    );
  } catch (err) {
    captureError(err, { route: "GET /api/posts/[slug]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// PUT /api/posts/[slug]
export async function PUT(request: Request, { params }: RouteParams) {
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
        include: { ArticleAuthor: { select: { userId: true } } },
      })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    // Owner = the primary author (Article.authorId) OR a co-author credited via the
    // ArticleAuthor byline table — bylines are credit AND edit access, not just display.
    const isOwner =
      article.authorId === session.user.id ||
      article.ArticleAuthor.some((a) => a.userId === session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);
    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const { data, error } = await validateBody(request, updateArticleSchema);
    if (error) return error;

    let updatedSlug = article.slug;
    if (data.slug && data.slug !== article.slug) {
      updatedSlug = await generateUniqueSlug(data.slug);
    } else if (data.title && data.title !== article.title && !data.slug) {
      updatedSlug = await generateUniqueSlug(data.title);
    }

    if (article.status === "PUBLISHED") {
      const versionCount = await withRetry(() =>
        prisma.articleVersion.count({ where: { articleId: article.id } })
      );
      await withRetry(() =>
        prisma.articleVersion.create({
          data: {
            articleId: article.id,
            versionNumber: versionCount + 1,
            title: article.title,
            content: article.content as object,
            editorId: session.user.id,
          },
        })
      );
    }

    const { tagIds } = data;
    if (tagIds) {
      await withRetry(() => prisma.articleTag.deleteMany({ where: { articleId: article.id } }));
      await withRetry(() =>
        prisma.articleTag.createMany({
          data: tagIds.map((tagId: string) => ({ articleId: article.id, tagId })),
        })
      );
    }

    const updated = await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          title: data.title,
          slug: updatedSlug,
          content: data.content as any,
          excerpt: data.excerpt,
          featuredImageUrl: data.featuredImageUrl,
          featuredImageCredit: data.featuredImageCredit,
          contentType: data.contentType,
          guideType: data.guideType,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          focusKeyword: data.focusKeyword,
          featured: data.featured,
          isBreaking: data.isBreaking,
          isSponsored: data.isSponsored,
          sponsorName: data.sponsorName,
          isLiveBlog: data.isLiveBlog,
          scheduledAt: data.scheduledAt !== undefined
            ? (data.scheduledAt ? new Date(data.scheduledAt) : null)
            : undefined,
          autosaveContent: null as any,
          autosavedAt: null,
          // Handle status changes: if transitioning to PUBLISHED, stamp publishedAt
          ...(data.status !== undefined && { status: data.status }),
          ...(data.status === "PUBLISHED" && {
            publishedAt: article.publishedAt ?? new Date(),
            originallyPublishedAt: article.originallyPublishedAt ?? new Date(),
          }),
          ...(data.gameIds !== undefined && {
            Game: { set: data.gameIds.map((id: string) => ({ id })) },
          }),
        },
        include: {
          User_Article_authorIdToUser: { select: { id: true, username: true, displayName: true } },
          ArticleTag: { include: { Tag: true } },
          Game: { select: { id: true, title: true } },
        },
      })
    );

    try {
      await cacheDeletePattern("posts:list:*");
      await cacheDeletePattern("walkthroughs:hub:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    if (updated.status === "PUBLISHED") {
      await purgeArticle(updated.slug, updated.contentType);
      await revalidateArticlePaths(updated.slug, updated.contentType);
      if (updatedSlug !== article.slug) {
        // Slug changed while published — also purge/revalidate the OLD url
        // (using the pre-update contentType, in case type changed too).
        await purgeArticle(article.slug, article.contentType);
        await revalidateArticlePaths(article.slug, article.contentType);
      }
      // Keep Algolia (recommendations, search) and the Postgres search vector
      // in sync — without this, edits to a published article's title/slug
      // leave stale data behind until the next publish/approve action.
      await addSearchIndexJob({ articleId: updated.id, action: "index" });
      // Bust facets cache so filter counts reflect newly published article
      if (updated.contentType === "GUIDE") {
        try { await cacheDeletePattern("guides:facets:*"); } catch (err) {}
      }
    } else if (article.status === "PUBLISHED") {
      // Was published, now isn't (e.g. unpublished/archived) — drop it from the index.
      await addSearchIndexJob({ articleId: updated.id, action: "remove" });
      await purgeArticle(article.slug, article.contentType);
      await revalidateArticlePaths(article.slug, article.contentType);
      // Bust facets cache so filter counts reflect the removal
      if (article.contentType === "GUIDE") {
        try { await cacheDeletePattern("guides:facets:*"); } catch (err) {}
      }
    }

    return NextResponse.json(successResponse(serializeArticle(updated), "Article updated"));
  } catch (err) {
    captureError(err, { route: "PUT /api/posts/[slug]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// DELETE /api/posts/[slug] — hard delete.
// ADMIN can delete anything (this is also how a pending deletion request gets
// fulfilled). The owner (author or co-author) can additionally self-delete their
// own DRAFT/IN_REVIEW article directly, since nothing public depends on it yet —
// anything further along (APPROVED/PUBLISHED/ARCHIVED) requires going through
// POST /api/posts/[slug]/request-deletion instead.
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
        include: { ArticleAuthor: { select: { userId: true } } },
      })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner =
      article.authorId === session.user.id ||
      article.ArticleAuthor.some((a) => a.userId === session.user.id);
    const isOwnerDiscardingUnpublished =
      isOwner && (article.status === "DRAFT" || article.status === "IN_REVIEW");

    if (!isAdmin && !isOwnerDiscardingUnpublished) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    await withRetry(() => prisma.article.delete({ where: { id: article.id } }));

    // Remove from Algolia search index so filter facet counts stay accurate
    try {
      await addSearchIndexJob({ articleId: article.id, action: "remove" });
    } catch (err) {
      logger.warn({ err }, "Algolia de-index job failed to enqueue");
    }

    try {
      await cacheDeletePattern("posts:list:*");
      await cacheDeletePattern("walkthroughs:hub:*");
      // Bust guide and post facets caches so filter counts reflect the deletion immediately
      await cacheDeletePattern("guides:facets:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Article permanently deleted"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/posts/[slug]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
