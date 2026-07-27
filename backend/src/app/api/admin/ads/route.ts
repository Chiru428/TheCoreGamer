import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateAdPlacementSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { rateLimit } from "@/middleware/rateLimit";

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const ads = await prisma.adPlacement.findMany({ orderBy: { zoneId: "asc" } });
    return NextResponse.json(successResponse(ads));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
