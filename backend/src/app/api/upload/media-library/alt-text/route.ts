import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { v2 as cloudinary } from "cloudinary";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function PATCH(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], request);
    if (roleCheck) return roleCheck;

    const { publicId, altText, caption } = await request.json();

    if (!publicId) {
      return NextResponse.json(errorResponse("publicId is required"), { status: 400 });
    }

    const contextParams = [];
    if (altText !== undefined) contextParams.push(`alt=${altText}`);
    if (caption !== undefined) contextParams.push(`caption=${caption}`);

    if (contextParams.length === 0) {
      return NextResponse.json(successResponse({ success: true }));
    }

    const result = await cloudinary.api.update(publicId, {
      context: contextParams.join("|"),
    });

    return NextResponse.json(
      successResponse({
        publicId: result.public_id,
        context: result.context?.custom,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
