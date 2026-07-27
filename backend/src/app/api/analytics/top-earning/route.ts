import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const topArticles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        publishedAt: true,
        User_Article_authorIdToUser: { select: { displayName: true } },
      },
    });

    return NextResponse.json(
      successResponse(topArticles.map((a) => {
        const { User_Article_authorIdToUser, ...rest } = a;
        return {
          ...rest,
          viewCount: a.viewCount.toString(),
          author: User_Article_authorIdToUser,
        };
      }))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
