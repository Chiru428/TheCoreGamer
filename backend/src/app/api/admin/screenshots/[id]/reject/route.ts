import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/screenshots/[id]/reject — reject a pending user screenshot.
 * Rejected screenshots are removed entirely (and cleaned up from Cloudinary)
 * since UserScreenshotStatus has no REJECTED state for them to live in.
 */
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

    if (screenshot.imageUrl && screenshot.imageUrl.includes("cloudinary.com")) {
      const parts = screenshot.imageUrl.split("/upload/");
      if (parts.length > 1) {
        const afterUpload = parts[1];
        const pathParts = afterUpload.split("/");
        if (pathParts[0].startsWith("v")) {
          pathParts.shift(); // remove version
        }
        const withExt = pathParts.join("/");
        const publicId = withExt.replace(/\.[^/.]+$/, ""); // remove extension
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (e) {
            console.error("Failed to delete from Cloudinary:", e);
          }
        }
      }
    }

    await prisma.userScreenshot.delete({ where: { id } });

    return NextResponse.json(successResponse(null, "Screenshot rejected"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
