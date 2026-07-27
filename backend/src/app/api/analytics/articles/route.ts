import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const authorId = searchParams.get("authorId");
    const { page, limit, skip } = parsePagination(searchParams);

    const isAdminOrEditor = ["ADMIN", "EDITOR"].includes(session.user.role);
    const targetAuthorId = authorId || session.user.id;

    // Non-admin users can only see their own stats
    if (!isAdminOrEditor && targetAuthorId !== session.user.id) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const where = isAdminOrEditor && !authorId ? {} : { authorId: targetAuthorId };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { viewCount: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          publishedAt: true,
          contentType: true,
          _count: {
            select: {
              Comment: { where: { status: "APPROVED" } },
              ArticleReaction: { where: { type: "LIKE" } },
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    const serialized = articles.map((a) => ({
      ...a,
      viewCount: a.viewCount.toString(),
    }));

    return NextResponse.json(
      successResponse(serialized, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
