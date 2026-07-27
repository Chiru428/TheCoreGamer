import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    await (prisma.comment as any).update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });
    return NextResponse.json(successResponse(null, "Comment reported for review"));
  } catch (err) {
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

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    const newCount = Math.max(0, ((comment as any).reportCount || 0) - 1);
    await (prisma.comment as any).update({ where: { id }, data: { reportCount: newCount } });
    return NextResponse.json(successResponse(null, "Report removed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
