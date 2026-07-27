import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateReviewScoreSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateReviewScoreSchema);
    if (error) return error;

    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { GameReview: true },
    });
    if (!article || !article.GameReview)
      return NextResponse.json(errorResponse("Review not found"), { status: 404 });

    const updated = await prisma.gameReview.update({
      where: { id: article.GameReview.id },
      data: {
        originalScore: article.GameReview.originalScore || article.GameReview.reviewScore,
        reviewScore: data.reviewScore,
        scoreUpdatedAt: new Date(),
        scoreUpdateReason: data.reason,
      },
    });

    return NextResponse.json(successResponse(updated, "Review score updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
