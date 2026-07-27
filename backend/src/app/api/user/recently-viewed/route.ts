import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, "READ");
  if (rl) return rl;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json(successResponse([]));
    const items = await prisma.recentlyViewed.findMany({
      where: { userId: session.user.id },
      orderBy: { viewedAt: "desc" },
      take: 10,
      include: {
        Article: {
          select: {
            id: true,
            title: true,
            slug: true,
            contentType: true,
            featuredImageUrl: true,
            publishedAt: true,
            createdAt: true,
            GameReview: { select: { reviewScore: true } },
          },
        },
      },
    });
    return NextResponse.json(
      successResponse(items.map((i) => {
        const { GameReview, ...rest } = i.Article;
        return { 
          ...rest, 
          gameReview: GameReview ? { reviewScore: GameReview.reviewScore !== null ? Number(GameReview.reviewScore) : null } : null,
          viewedAt: i.viewedAt 
        };
      }))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
