import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;
    const { slug } = await params;
    const article = await prisma.article.findUnique({ where: { slug, contentType: "MOD_GUIDE" } });
    if (!article) return NextResponse.json(errorResponse("Mod guide not found"), { status: 404 });
    if (article.status !== "DRAFT") {
      return NextResponse.json(errorResponse("Only drafts can be submitted for review"), {
        status: 400,
      });
    }
    await prisma.article.update({ where: { id: article.id }, data: { status: "IN_REVIEW" } });
    return NextResponse.json(successResponse(null, "Mod guide submitted for editorial review"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
