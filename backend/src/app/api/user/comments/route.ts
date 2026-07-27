import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const comments = await prisma.comment.findMany({
      where: { authorId: session!.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        Article: {
          select: { title: true, slug: true, contentType: true },
        },
      },
    });

    const normalizedComments = comments.map((c) => {
      const { Article, ...rest } = c as any;
      return {
        ...rest,
        article: Article || null,
      };
    });

    return NextResponse.json(successResponse(normalizedComments));
  } catch (err) {
    captureError(err, { route: "GET /api/user/comments" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
