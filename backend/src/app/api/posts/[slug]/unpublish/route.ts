import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
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

    const { slug } = await params;
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    if (article.status !== "PUBLISHED")
      return NextResponse.json(errorResponse("Article is not published"), { status: 400 });

    await prisma.article.update({
      where: { id: article.id },
      data: { status: "DRAFT", publishedAt: null },
    });

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

    await purgeArticle(article.slug, article.contentType);
    await revalidateArticlePaths(article.slug, article.contentType);

    return NextResponse.json(successResponse(null, "Article unpublished"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
