import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { cacheDelete, cacheDeletePattern } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** POST /api/articles/[slug]/live-blog/end — mark the live blog as ended */
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { slug }, select: { id: true, isLiveBlog: true } })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }
    if (!article.isLiveBlog) {
      return NextResponse.json(errorResponse("Article is not a live blog"), { status: 400 });
    }

    const updated = await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: { liveBlogEndedAt: new Date() },
        select: { id: true, slug: true, isLiveBlog: true, liveBlogEndedAt: true },
      })
    );

    try {
      await cacheDelete(`liveblog:${slug}`);
      await cacheDeletePattern(`post:${slug}`);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(updated, "Live blog ended"));
  } catch (err) {
    captureError(err, { route: "POST /api/articles/[slug]/live-blog/end" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
