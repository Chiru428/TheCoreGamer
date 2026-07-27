import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateAdPlacementSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ zoneId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateAdPlacementSchema);
    if (error) return error;

    const { zoneId } = await params;
    const ad = await prisma.adPlacement.findUnique({ where: { zoneId } });
    if (!ad) return NextResponse.json(errorResponse("Ad zone not found"), { status: 404 });

    const updated = await prisma.adPlacement.update({ where: { zoneId }, data });
    return NextResponse.json(successResponse(updated, "Ad placement updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
