import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateScreenshotStatusSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateScreenshotStatusSchema);
    if (error) return error;

    const { id } = await params;
    const screenshot = await prisma.userScreenshot.findUnique({ where: { id } });
    if (!screenshot)
      return NextResponse.json(errorResponse("Screenshot not found"), { status: 404 });

    const updated = await prisma.userScreenshot.update({
      where: { id },
      data: { status: data.status },
    });
    return NextResponse.json(successResponse(updated, `Screenshot ${data.status.toLowerCase()}`));
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

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const screenshot = await prisma.userScreenshot.findUnique({ where: { id } });
    if (!screenshot)
      return NextResponse.json(errorResponse("Screenshot not found"), { status: 404 });

    // Try to extract publicId from Cloudinary URL to free up space
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
    return NextResponse.json(successResponse(null, "Screenshot deleted permanently"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
