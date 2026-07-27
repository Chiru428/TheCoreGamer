import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { cacheDelete } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ slug: string; updateId: string }>;
}

/** PATCH /api/articles/[slug]/live-updates/[updateId] — toggle isPinned */
export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug, updateId } = await params;

    const existing = await withRetry(() =>
      prisma.liveBlogUpdate.findUnique({
        where: { id: updateId },
        select: { id: true, isPinned: true, Article: { select: { slug: true } } },
      })
    );

    if (!existing || existing.Article.slug !== slug) {
      return NextResponse.json(errorResponse("Live update not found"), { status: 404 });
    }

    const updated = await withRetry(() =>
      prisma.liveBlogUpdate.update({
        where: { id: updateId },
        data: { isPinned: !existing.isPinned },
        include: {
          User: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      })
    );

    try {
      await cacheDelete(`liveblog:${slug}`);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(
      successResponse({ ...updated, author: updated.User, User: undefined }, "Live update toggled")
    );
  } catch (err) {
    captureError(err, { route: "PATCH /api/articles/[slug]/live-updates/[updateId]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** DELETE /api/articles/[slug]/live-updates/[updateId] — remove a live blog update */
export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug, updateId } = await params;

    const existing = await withRetry(() =>
      prisma.liveBlogUpdate.findUnique({
        where: { id: updateId },
        select: { id: true, Article: { select: { slug: true } } },
      })
    );

    if (!existing || existing.Article.slug !== slug) {
      return NextResponse.json(errorResponse("Live update not found"), { status: 404 });
    }

    await withRetry(() => prisma.liveBlogUpdate.delete({ where: { id: updateId } }));

    try {
      await cacheDelete(`liveblog:${slug}`);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(null, "Live update deleted"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/articles/[slug]/live-updates/[updateId]" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
