import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { createLiveBlogUpdateSchema } from "@/validators";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const LIVE_UPDATES_CACHE_TTL = 15;

/** GET /api/articles/[slug]/live-updates — public, cached for 15s */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const cacheKey = `liveblog:${slug}`;

    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const updates = await withRetry(() =>
      prisma.liveBlogUpdate.findMany({
        where: { articleId: article.id },
        include: {
          User: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { publishedAt: "desc" },
      })
    );

    const mapped = updates.map((u) => ({ ...u, author: u.User, User: undefined }));

    try {
      await cacheSet(cacheKey, mapped, LIVE_UPDATES_CACHE_TTL);
    } catch {
      /* intentionally empty */
    }

    return NextResponse.json(successResponse(mapped));
  } catch (err) {
    captureError(err, { route: "GET /api/articles/[slug]/live-updates" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** POST /api/articles/[slug]/live-updates — add a new live blog update */
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { slug } = await params;

    const { data, error } = await validateBody(request, createLiveBlogUpdateSchema);
    if (error) return error;

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const update = await withRetry(() =>
      prisma.liveBlogUpdate.create({
        data: {
          articleId: article.id,
          authorId: session!.user.id,
          content: data.content as object,
          label: data.label || null,
        },
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
      successResponse({ ...update, author: update.User, User: undefined }, "Live update posted"),
      { status: 201 }
    );
  } catch (err) {
    captureError(err, { route: "POST /api/articles/[slug]/live-updates" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
