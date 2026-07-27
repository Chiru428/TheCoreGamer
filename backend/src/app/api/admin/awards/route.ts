import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { createAwardSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheDeletePattern } from "@/lib/redis";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    const where = year ? { year: parseInt(year, 10) } : {};

    const awards = await prisma.award.findMany({
      where,
      orderBy: [{ year: "desc" }, { category: "asc" }],
      include: {
        winnerGame: { select: { id: true, title: true, coverImageUrl: true } }
      }
    });

    return NextResponse.json(successResponse(awards));
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, createAwardSchema);
    if (error) return error;

    const award = await prisma.award.create({
      data: {
        year: data.year,
        category: data.category,
        winnerGameId: data.winnerGameId || null,
        nomineesJson: data.nomineesJson || '[]',
        editorPickId: data.editorPickId || null,
        isVotingOpen: data.isVotingOpen || false,
      }
    });

    try {
      await cacheDeletePattern(`awards:${award.year}`);
    } catch (e) {
      console.warn("Failed to delete cache pattern", e);
    }

    return NextResponse.json(successResponse(award, "Award created"), { status: 201 });
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
