import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;
    const { slug } = await params;
    const article = await prisma.article.findUnique({ where: { slug, contentType: "REVIEW" } });
    if (!article) return NextResponse.json(errorResponse("Review not found"), { status: 404 });
    await prisma.article.update({ where: { id: article.id }, data: { status: "DRAFT" } });
    try {
      await cacheDeletePattern("reviews:list:*");
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(successResponse(null, "Review rejected"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
