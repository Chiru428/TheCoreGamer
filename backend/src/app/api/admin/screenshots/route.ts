import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import type { Prisma, UserScreenshotStatus } from "@/generated/prisma";
import { rateLimit } from "@/middleware/rateLimit";

/**
 * GET /api/admin/screenshots
 * Moderation queue for user-submitted game screenshots. Defaults to PENDING.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status");
    const where: Prisma.UserScreenshotWhereInput =
      status && status !== "ALL"
        ? { status: status as UserScreenshotStatus }
        : { status: "PENDING" };

    const [screenshots, total] = await withRetry(() =>
      Promise.all([
        prisma.userScreenshot.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            User: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            Game: { select: { id: true, title: true, slug: true } },
          },
        }),
        prisma.userScreenshot.count({ where }),
      ])
    );

    return NextResponse.json(
      successResponse(screenshots, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
