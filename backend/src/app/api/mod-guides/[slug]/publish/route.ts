import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
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
    const session = await auth();
    const { slug } = await params;
    const article = await prisma.article.findUnique({ where: { slug, contentType: "GUIDE", guideType: "Mod Guide" } });
    if (!article) return NextResponse.json(errorResponse("Mod guide not found"), { status: 404 });
    await prisma.article.update({
      where: { id: article.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), editorId: session!.user.id },
    });
    try {
      await cacheDeletePattern("mod-guides:list:*");
    } catch {
      /* intentionally empty */
    }
    await purgeArticle(article.slug, "GUIDE");
    await revalidateArticlePaths(article.slug, "GUIDE");
    return NextResponse.json(successResponse(null, "Mod guide published"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
