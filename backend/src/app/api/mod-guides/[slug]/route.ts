import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { updateModGuideSchema } from "@/validators";
import { generateUniqueSlug } from "@/lib/slug";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse, serializeArticle } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { withRetry } from "@/lib/withRetry";
import { addSearchIndexJob } from "@/lib/bullmq";
import { cacheDeletePattern } from "@/lib/redis";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";

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
          User_Article_authorIdToUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          ArticleTag: { include: { Tag: true } },
          ModGuide: {
            include: {
              MediaAttachment: true,
              Game: { select: { id: true, slug: true, title: true } },
              User_ModGuide_lastVerifiedByIdToUser: {
                select: { id: true, displayName: true, avatarUrl: true },
              },
            },
          },
          Game: { select: { id: true, title: true } },
        },
      })
    );

    if (!article || !article.ModGuide)
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });

    // Use raw SQL to increment viewCount WITHOUT touching updatedAt (Prisma's update() always stamps @updatedAt)
    prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE id = ${article.id}`
      .catch(() => {});

    // Check staleness (6+ months since last compatibility update)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const isStale = article.updatedAt < sixMonthsAgo;

    return NextResponse.json(successResponse({ ...serializeArticle(article), isStale }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { slug } = await params;

    // Retry the lookup — pooler occasionally drops idle connections transiently
    const article = await withRetry(() =>
      prisma.article.findUnique({
        where: { slug },
        include: { ModGuide: true, ArticleAuthor: { select: { userId: true } } },
      })
    );
    if (!article || !article.ModGuide)
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });

    // Owner = the primary author (Article.authorId) OR a co-author credited via the
    // ArticleAuthor byline table — bylines are credit AND access, not just display.
    const isOwner =
      article.authorId === session.user.id ||
      article.ArticleAuthor.some((a) => a.userId === session.user.id);
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);
    if (!isOwner && !isEditorOrAdmin)
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });

    const { data, error } = await validateBody(request, updateModGuideSchema);
    if (error) return error;

    let updatedSlug = article.slug;
    if (data.slug && data.slug !== article.slug) {
      updatedSlug = await generateUniqueSlug(data.slug);
    } else if (data.title && data.title !== article.title && !data.slug) {
      updatedSlug = await generateUniqueSlug(data.title);
    }

    // Use nested writes to avoid interactive transaction timeouts with Supabase pooler
    const updated = await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          slug: updatedSlug,
          ...(data.content !== undefined && { content: data.content as Prisma.InputJsonValue }),
          ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
          ...(data.featuredImageUrl !== undefined && { featuredImageUrl: data.featuredImageUrl }),
          ...(data.featuredImageCredit !== undefined && { featuredImageCredit: data.featuredImageCredit }),
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
          // Handle status changes: if transitioning to PUBLISHED, stamp publishedAt
          ...(data.status !== undefined && { status: data.status }),
          ...(data.status === "PUBLISHED" && {
            publishedAt: article.publishedAt ?? new Date(),
            originallyPublishedAt: article.originallyPublishedAt ?? new Date(),
          }),
          ...(data.tagIds !== undefined && {
            ArticleTag: {
              deleteMany: {},
              create: data.tagIds.map((tagId: string) => ({ tagId })),
            },
          }),
          ...(data.gameIds !== undefined && {
            Game: { set: data.gameIds.map((id: string) => ({ id })) },
          }),
          ModGuide: {
            update: {
              ...(data.gameName !== undefined && { gameName: data.gameName }),
              ...(data.modName !== undefined && { modName: data.modName }),
              ...(data.gameVersionNotes !== undefined && {
                gameVersionNotes: data.gameVersionNotes,
              }),
              ...(data.gameVersion !== undefined && { gameVersion: data.gameVersion }),
              ...(data.gameVersionDate !== undefined && {
                gameVersionDate: data.gameVersionDate ? new Date(data.gameVersionDate) : null,
              }),
              ...(data.compatibilityNotes !== undefined && {
                compatibilityNotes: data.compatibilityNotes,
              }),
              ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
              ...(data.estimatedInstallMinutes !== undefined && {
                estimatedInstallMinutes: data.estimatedInstallMinutes,
              }),
              ...(data.prerequisiteList !== undefined && {
                prerequisiteList: data.prerequisiteList,
              }),
              ...(data.sections !== undefined && { sections: data.sections as Prisma.InputJsonValue }),
              ...(data.bodyTitle !== undefined && { bodyTitle: data.bodyTitle }),
              ...(data.installationTitle !== undefined && {
                installationTitle: data.installationTitle,
              }),
            },
          },
        },
      })
    );

    try {
      await cacheDeletePattern("mod-guides:list:*");
    } catch {}

    if (updated.status === "PUBLISHED") {
      await purgeArticle(updated.slug, "GUIDE");
      await revalidateArticlePaths(updated.slug, "GUIDE");
      if (updatedSlug !== article.slug) {
        await purgeArticle(article.slug, "GUIDE");
        await revalidateArticlePaths(article.slug, "GUIDE");
      }
      // Keep Algolia (recommendations, search) and the Postgres search vector
      // in sync — without this, edits to a published guide's title/slug leave
      // stale data behind until the next publish/approve action.
      await addSearchIndexJob({ articleId: updated.id, action: "index" });
    } else if (article.status === "PUBLISHED") {
      // Was published, now isn't (e.g. unpublished/archived) — drop it from the index.
      await addSearchIndexJob({ articleId: updated.id, action: "remove" });
      await purgeArticle(article.slug, "GUIDE");
      await revalidateArticlePaths(article.slug, "GUIDE");
    }

    return NextResponse.json(successResponse(null, "Guide updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
