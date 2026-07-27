import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import type { Prisma, CommentStatus } from "@/generated/prisma";
import { rateLimit } from "@/middleware/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Prisma.CommentWhereInput = {};
    const status = searchParams.get("status");
    if (status === "REPORTED") {
      (where as any).reportCount = { gt: 0 };
    } else if (status && status !== "ALL") {
      where.status = status as CommentStatus;
    }

    const [comments, total] = await withRetry(() =>
      Promise.all([
        (prisma.comment as any).findMany({
          where,
          skip,
          take: limit,
          orderBy:
            status === "APPROVED"
              ? [{ reportCount: "desc" }, { createdAt: "desc" }]
              : { createdAt: "desc" },
          include: { Article: { select: { title: true, slug: true } } },
        }),
        prisma.comment.count({ where }),
      ])
    );

    const normalized = comments.map(({ Article, ...c }: any) => ({ ...c, article: Article }));

    return NextResponse.json(
      successResponse(normalized, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
