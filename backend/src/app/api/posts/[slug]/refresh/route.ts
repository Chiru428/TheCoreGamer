import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { cacheDeletePattern } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** PATCH /api/posts/[slug]/refresh — mark article as majorly updated */
export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { slug }, select: { id: true, title: true } })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(errorResponse("Invalid JSON body"), { status: 400 });
    }

    const { updateNote } = body;
    if (!updateNote || typeof updateNote !== "string" || updateNote.trim().length === 0) {
      return NextResponse.json(errorResponse("updateNote is required"), { status: 400 });
    }
    if (updateNote.trim().length > 200) {
      return NextResponse.json(errorResponse("updateNote must be 200 characters or less"), { status: 400 });
    }

    const updated = await withRetry(() =>
      prisma.article.update({
        where: { id: article.id },
        data: {
          lastMajorUpdateAt: new Date(),
          lastMajorUpdateNote: updateNote.trim(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          slug: true,
          lastMajorUpdateAt: true,
          lastMajorUpdateNote: true,
        },
      })
    );

    // Invalidate caches
    try {
      await cacheDeletePattern(`post:${slug}`);
      await cacheDeletePattern("posts:list:*");
    } catch { /* non-fatal */ }

    return NextResponse.json(successResponse(updated, "Article marked as updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
