import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { requireRole } from "@/middleware/requireRole";
import { auth } from "@/lib/auth";
import { addSearchIndexJob, addPushJob } from "@/lib/bullmq";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { contentTypePath } from "@/lib/seoPaths";

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
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    const updateData: Prisma.ArticleUncheckedUpdateInput = {
      status: "PUBLISHED",
      publishedAt: new Date(),
      editorId: session!.user.id,
      autosaveContent: null as any,
      autosavedAt: null,
    };
    // originallyPublishedAt is immutable — only ever set on first publish, never overwritten
    if (!article.originallyPublishedAt) {
      updateData.originallyPublishedAt = new Date();
    }

    await prisma.article.update({
      where: { id: article.id },
      data: updateData,
    });

    await addSearchIndexJob({ articleId: article.id, action: "index" });
    await addPushJob({
      title: article.title,
      body: article.excerpt || "New article on TheCoreGamer!",
      url: `/${contentTypePath(article.contentType)}/${article.slug}`,
    });

    try {
      const { cacheDeletePattern, cacheDelete } = await import("@/lib/redis");
      await Promise.all([
        cacheDeletePattern("posts:list:*"),
        cacheDeletePattern("walkthroughs:hub:*"),
        cacheDeletePattern("feed:anon:*"),
        cacheDeletePattern("feed:auth:*"),
        cacheDelete("homepage:data"),
      ]);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    await purgeArticle(article.slug, article.contentType);
    await revalidateArticlePaths(article.slug, article.contentType);

    return NextResponse.json(successResponse(null, "Article published"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
