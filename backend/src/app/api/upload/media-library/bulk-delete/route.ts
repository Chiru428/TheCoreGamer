import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { v2 as cloudinary } from "cloudinary";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function DELETE(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const { publicIds } = await request.json();

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json(errorResponse("publicIds array is required"), { status: 400 });
    }

    const result = await cloudinary.api.delete_resources(publicIds);

    return NextResponse.json(
      successResponse({
        deleted: result.deleted,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
