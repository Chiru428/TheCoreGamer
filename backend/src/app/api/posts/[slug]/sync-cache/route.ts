import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { cacheDeletePattern } from "@/lib/redis";
import { purgeArticle } from "@/lib/cloudflare";
import { revalidateArticlePaths } from "@/lib/revalidate";
import { addSearchIndexJob } from "@/lib/bullmq";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** POST /api/posts/[slug]/sync-cache — Force purge caches for this article */
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    // Must be admin or editor to trigger cache sync
    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { slug }, select: { id: true, contentType: true, status: true } })
    );
    
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    // 1. Purge Redis caches
    try {
      await cacheDeletePattern(`post:${slug}`);
      await cacheDeletePattern("posts:list:*");
      await cacheDeletePattern("walkthroughs:hub:*");
      if (article.contentType === "GUIDE") {
        await cacheDeletePattern("guides:facets:*");
      }
    } catch (err) {
      logger.warn({ err }, "Redis cache invalidation failed");
    }

    // 2. Purge Cloudflare and Revalidate Next.js cache
    await purgeArticle(slug, article.contentType);
    await revalidateArticlePaths(slug, article.contentType);

    // 3. Sync Algolia search index
    if (article.status === "PUBLISHED") {
      await addSearchIndexJob({ articleId: article.id, action: "index" });
    }

    return NextResponse.json(successResponse(null, "Cache synced successfully"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
