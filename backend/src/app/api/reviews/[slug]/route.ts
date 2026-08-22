import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { getScoreBadge } from "@/lib/constants";
import { generateUniqueSlug } from "@/lib/slug";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { z } from "zod";
import { csrfProtection } from "@/middleware/csrfProtection";
import { logger } from "@/lib/logger";
import { addSearchIndexJob } from "@/lib/bullmq";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";

const updateReviewSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  excerpt: z.string().max(300).optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal("")),
  featuredImageCredit: z.string().max(200).optional().nullable(),
  tagIds: z.array(z.string().min(1)).optional(),
  seoTitle: z.string().max(90).optional(),
  seoDescription: z.string().max(250).optional(),
  focusKeyword: z.string().max(100).optional(),
  featured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().max(120).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  embargoUntil: z.string().datetime().optional().nullable(),
  gameTitle: z.string().min(1).optional(),
  developer: z.string().min(1).optional(),
  publisher: z.string().min(1).optional(),
  releaseDate: z.string().datetime().optional(),
  platforms: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  reviewScore: z.number().min(0).max(10).multipleOf(0.1).optional(),
  verdict: z.string().optional(),
  showReviewDetails: z.boolean().optional(),
  gameId: z.string().min(1).optional(),
  gameIds: z.array(z.string().min(1)).optional(),
  scoreUpdateReason: z.string().max(500).optional(),
  platformsTested: z.array(z.string()).optional(),
  copyProvidedByPublisher: z.boolean().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
});

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        include: {
          User_Article_authorIdToUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, expertise: true },
          },
          ArticleTag: { include: { Tag: true } },
          GameReview: {
            include: {
              ReviewScorePlatforms: true,
              ScoreHistory: { orderBy: { changedAt: "desc" } },
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
          Game: { select: { id: true, title: true, slug: true } },
          Poll: { where: { isActive: true }, take: 3 },
          _count: {
            select: {
              Comment: { where: { status: "APPROVED" } },
              ArticleReaction: { where: { type: "LIKE" } },
            },
          },
        },
      })
    );

    if (!article || !article.GameReview) {
      return NextResponse.json(errorResponse("Review not found"), { status: 404 });
    }

    // Use raw SQL to increment viewCount WITHOUT touching updatedAt (Prisma's update() always stamps @updatedAt)
    prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE id = ${article.id}`
      .catch(() => {});

    const scoreBadge = getScoreBadge(Number(article.GameReview.reviewScore));

    let communityScore: number | null = null;
    let communityRatingCount = 0;
    if (article.GameReview?.gameId) {
      const agg = await prisma.userRating.aggregate({
        where: { gameId: article.GameReview.gameId },
        _avg: { score: true },
        _count: { score: true },
      });
      communityScore = agg._avg.score ? Number(agg._avg.score.toFixed(1)) : null;
      communityRatingCount = agg._count.score;
    }

    return NextResponse.json(
      successResponse({
        ...serializeArticle(article),
        scoreBadge,
        communityScore,
        communityRatingCount,
      })
    );
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

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { slug } = await params;
    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        include: { GameReview: true, ArticleAuthor: { select: { userId: true } } },
      })
    );
    if (!article || !article.GameReview) {
      return NextResponse.json(errorResponse("Review not found"), { status: 404 });
    }

    // Owner = the primary author (Article.authorId) OR a co-author credited via the
    // ArticleAuthor byline table — bylines are credit AND access, not just display.
    const isOwner =
      article.authorId === session.user.id ||
      article.ArticleAuthor.some((a) => a.userId === session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);
    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const { data, error } = await validateBody(request, updateReviewSchema);
    if (error) return error;

    let updatedSlug = article.slug;
    if (data.slug && data.slug !== article.slug) {
      updatedSlug = await generateUniqueSlug(data.slug);
    } else if (data.title && data.title !== article.title && !data.slug) {
      updatedSlug = await generateUniqueSlug(data.title);
    }

    const updated = await withRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const updatedArticle = await tx.article.update({
            where: { id: article.id },
            data: {
              ...(data.title !== undefined && { title: data.title }),
              slug: updatedSlug,
              ...(data.content !== undefined && { content: data.content }),
              ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
              ...(data.featuredImageUrl !== undefined && {
                featuredImageUrl: data.featuredImageUrl || null,
              }),
              ...(data.featuredImageCredit !== undefined && {
                featuredImageCredit: data.featuredImageCredit || null,
              }),
              ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
              ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
              ...(data.focusKeyword !== undefined && { focusKeyword: data.focusKeyword }),
              ...(data.featured !== undefined && { featured: data.featured }),
              ...(data.isBreaking !== undefined && { isBreaking: data.isBreaking }),
              ...(data.isSponsored !== undefined && { isSponsored: data.isSponsored }),
              ...(data.sponsorName !== undefined && { sponsorName: data.sponsorName }),
              ...(data.scheduledAt !== undefined && {
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
              }),
              ...(data.embargoUntil !== undefined && {
                embargoUntil: data.embargoUntil ? new Date(data.embargoUntil) : null,
              }),
              editorId: isEditorOrAdmin ? session.user.id : undefined,
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
              User_Article_authorIdToUser: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
              ArticleTag: { include: { Tag: true } },
              GameReview: true,
            },
          });

          if (data.tagIds) {
            await tx.articleTag.deleteMany({ where: { articleId: article.id } });
            if (data.tagIds.length > 0) {
              await tx.articleTag.createMany({
                data: data.tagIds.map((tagId: string) => ({ articleId: article.id, tagId })),
              });
            }
          }

          if (
            data.reviewScore !== undefined &&
            article.GameReview &&
            Number(data.reviewScore) !== Number(article.GameReview.reviewScore)
          ) {
            await tx.reviewScoreHistory.create({
              data: {
                reviewId: article.GameReview.id,
                oldScore: Number(article.GameReview.reviewScore),
                newScore: data.reviewScore,
                reason: data.scoreUpdateReason ?? "Score updated",
                changedById: session.user.id ?? null,
              },
            });
          }

          if (
            data.reviewScore !== undefined ||
            data.verdict !== undefined ||
            data.showReviewDetails !== undefined ||
            data.platformsTested !== undefined ||
            data.copyProvidedByPublisher !== undefined ||
            data.gameId !== undefined
          ) {
            await tx.gameReview.update({
              where: { articleId: article.id },
              data: {
                ...(data.reviewScore !== undefined && { reviewScore: data.reviewScore }),
                ...(data.verdict !== undefined && { verdict: data.verdict }),
                ...(data.platforms !== undefined && { platforms: data.platforms }),
                ...(data.genres !== undefined && { genres: data.genres }),
                ...(data.gameTitle !== undefined && { gameTitle: data.gameTitle }),
                ...(data.developer !== undefined && { developer: data.developer }),
                ...(data.publisher !== undefined && { publisher: data.publisher }),
                ...(data.releaseDate !== undefined && { releaseDate: new Date(data.releaseDate) }),
                ...(data.showReviewDetails !== undefined && {
                  showReviewDetails: data.showReviewDetails,
                }),
                ...(data.platformsTested !== undefined && {
                  platformsTested: data.platformsTested,
                }),
                ...(data.copyProvidedByPublisher !== undefined && {
                  copyProvidedByPublisher: data.copyProvidedByPublisher,
                }),
                ...(data.gameId !== undefined && { gameId: data.gameId }),
              },
            });
          }

          return updatedArticle;
        },
        { maxWait: 10000, timeout: 20000 }
      )
    );

    try {
      await cacheDeletePattern("reviews:list:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    if (updated.status === "PUBLISHED") {
      await purgeArticle(updated.slug, "REVIEW");
      await revalidateArticlePaths(updated.slug, "REVIEW");
      if (updatedSlug !== article.slug) {
        await purgeArticle(article.slug, "REVIEW");
        await revalidateArticlePaths(article.slug, "REVIEW");
      }
      // Keep Algolia (recommendations, search) and the Postgres search vector
      // in sync — without this, edits to a published review's title/slug leave
      // stale data behind until the next publish/approve action.
      await addSearchIndexJob({ articleId: updated.id, action: "index" });
      // Bust facets cache so filter counts reflect newly published article
      try { await cacheDeletePattern("reviews:facets:*"); } catch (err) {}
    } else if (article.status === "PUBLISHED") {
      // Was published, now isn't (e.g. unpublished/archived) — drop it from the index.
      await addSearchIndexJob({ articleId: updated.id, action: "remove" });
      await purgeArticle(article.slug, "REVIEW");
      await revalidateArticlePaths(article.slug, "REVIEW");
      // Bust facets cache so filter counts reflect the removal
      try { await cacheDeletePattern("reviews:facets:*"); } catch (err) {}
    }

    return NextResponse.json(successResponse(serializeArticle(updated), "Review updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;
    const article = await withRetry(() => prisma.article.findUnique({ where: { slug } }));
    if (!article) {
      return NextResponse.json(errorResponse("Review not found"), { status: 404 });
    }

    await withRetry(() => prisma.article.delete({ where: { id: article.id } }));

    // Remove from Algolia search index so filter facet counts stay accurate
    try {
      await addSearchIndexJob({ articleId: article.id, action: "remove" });
    } catch (err) {
      logger.warn({ err }, "Algolia de-index job failed to enqueue");
    }

    try {
      await cacheDeletePattern("reviews:list:*");
      // Bust the facets cache so filter counts reflect the deletion immediately
      await cacheDeletePattern("reviews:facets:*");
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(null, "Review permanently deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
