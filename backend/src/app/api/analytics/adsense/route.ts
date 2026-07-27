import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const range = request.nextUrl.searchParams.get("range") || "week";

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_ADSENSE_PUBLISHER_ID) {
      return NextResponse.json(
        successResponse({
          message: "AdSense not configured",
          range,
          data: [],
        })
      );
    }

    return NextResponse.json(
      successResponse({
        range,
        message:
          "Configure GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_ADSENSE_PUBLISHER_ID for live data",
        data: [],
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
