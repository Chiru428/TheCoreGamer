import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/admin/screenshots/[id]/approve — mark a user screenshot as approved */
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const screenshot = await prisma.userScreenshot.findUnique({ where: { id } });
    if (!screenshot)
      return NextResponse.json(errorResponse("Screenshot not found"), { status: 404 });

    const updated = await prisma.userScreenshot.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json(successResponse(updated, "Screenshot approved"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
