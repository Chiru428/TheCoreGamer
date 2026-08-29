import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { addSearchIndexJob, addPushJob } from "@/lib/bullmq";
import { sendArticleApprovalEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { contentTypePath } from "@/lib/seoPaths";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { User_Article_authorIdToUser: true },
    });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    if (article.status !== "IN_REVIEW")
      return NextResponse.json(errorResponse("Article is not in review"), { status: 400 });

    const now = new Date();

    // originallyPublishedAt is immutable — only set on first-ever publish, never overwritten
    const updateData: Prisma.ArticleUncheckedUpdateInput = {
      status: "PUBLISHED",
      publishedAt: now,
      editorId: session!.user.id,
    };
    if (!article.originallyPublishedAt) {
      updateData.originallyPublishedAt = now;
    }

    await prisma.article.update({
      where: { id: article.id },
      data: updateData,
    });

    // Send approval email fire-and-forget
    sendArticleApprovalEmail(
      article.User_Article_authorIdToUser.email!,
      article.User_Article_authorIdToUser.displayName,
      article.title,
      article.slug,
    ).catch(() => {});

    // Invalidate Redis caches
    try {
      const { cacheDeletePattern, cacheDelete } = await import("@/lib/redis");
      await Promise.all([
        cacheDeletePattern("posts:list:*"),
        cacheDeletePattern("feed:anon:*"),
        cacheDeletePattern("feed:auth:*"),
        cacheDelete("homepage:data"),
      ]);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    // Index in Postgres searchVector + Algolia
    await addSearchIndexJob({ articleId: article.id, action: "index" });

    // Push notification to subscribers
    await addPushJob({
      title: `New: ${article.title}`,
      body: article.excerpt || "Check out this new article on TheCoreGamer!",
      url: `/${contentTypePath(article.contentType)}/${article.slug}`,
    });

    // Purge Cloudflare CDN + revalidate Next.js ISR cache
    // Previously missing — mirrors what the /publish route already does
    await purgeArticle(article.slug, article.contentType);
    await revalidateArticlePaths(article.slug, article.contentType);

    return NextResponse.json(successResponse(null, "Article approved and published"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
