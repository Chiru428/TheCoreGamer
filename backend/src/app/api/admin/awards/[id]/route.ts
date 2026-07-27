import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateAwardSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const { data, error } = await validateBody(request, updateAwardSchema);
    if (error) return error;

    const existingAward = await prisma.award.findUnique({ where: { id } });
    if (!existingAward) {
      return NextResponse.json(errorResponse("Award not found"), { status: 404 });
    }

    const award = await prisma.award.update({
      where: { id },
      data: {
        year: data.year,
        category: data.category,
        winnerGameId: data.winnerGameId,
        nomineesJson: data.nomineesJson,
        editorPickId: data.editorPickId,
        isVotingOpen: data.isVotingOpen,
      }
    });

    try {
      await cacheDeletePattern(`awards:${award.year}`);
    } catch (e) {
      console.warn("Failed to delete cache pattern", e);
    }

    return NextResponse.json(successResponse(award, "Award updated"));
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    const existingAward = await prisma.award.findUnique({ where: { id } });
    if (!existingAward) {
      return NextResponse.json(errorResponse("Award not found"), { status: 404 });
    }

    await prisma.award.delete({ where: { id } });

    try {
      await cacheDeletePattern(`awards:${existingAward.year}`);
    } catch (e) {
      console.warn("Failed to delete cache pattern", e);
    }

    return NextResponse.json(successResponse(null, "Award deleted"));
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
