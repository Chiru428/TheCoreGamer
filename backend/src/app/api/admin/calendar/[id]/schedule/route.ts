import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { withRetry } from "@/lib/withRetry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    let body: { scheduledAt?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(errorResponse("Invalid JSON body"), { status: 400 });
    }

    const { scheduledAt } = body;

    // scheduledAt can be null (unschedule) or an ISO string (schedule)
    if (scheduledAt !== null && scheduledAt !== undefined) {
      const parsed = new Date(scheduledAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(errorResponse("Invalid scheduledAt date"), { status: 400 });
      }
      if (parsed <= new Date()) {
        return NextResponse.json(
          errorResponse("scheduledAt must be in the future"),
          { status: 422 }
        );
      }
    }

    const article = await withRetry(() =>
      prisma.article.findUnique({ where: { id }, select: { id: true, status: true } })
    );

    if (!article) {
      return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    }

    const updated = await withRetry(() =>
      prisma.article.update({
        where: { id },
        data: {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          contentType: true,
          scheduledAt: true,
          publishedAt: true,
          User_Article_authorIdToUser: {
            select: { displayName: true },
          },
        },
      })
    );

    return NextResponse.json(
      successResponse(
        {
          id: updated.id,
          title: updated.title,
          slug: updated.slug,
          status: updated.status,
          contentType: updated.contentType,
          scheduledAt: updated.scheduledAt ? updated.scheduledAt.toISOString() : null,
          publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
          authorDisplayName:
            (updated as any).User_Article_authorIdToUser?.displayName ?? "Unknown",
        },
        "Schedule updated"
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
