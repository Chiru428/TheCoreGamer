import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { listCloudinaryAssets } from "@/lib/cloudinary";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const search = request.nextUrl.searchParams.get("search") || "";
    const folder = request.nextUrl.searchParams.get("folder") || "thecoregamer";
    const altText = request.nextUrl.searchParams.get("altText") || undefined;
    const nextCursor = request.nextUrl.searchParams.get("cursor") || undefined;

    const result = await listCloudinaryAssets({
      prefix: search ? `${folder}/${search}` : folder,
      folder,
      altText,
      maxResults: 100,
      nextCursor,
    });

    const filteredResources = result.resources.filter((r: any) => !r.folder?.endsWith("/srcset"));

    return NextResponse.json(
      successResponse({
        assets: filteredResources.map((r: any) => ({
          public_id: r.public_id,
          secure_url: r.secure_url,
          width: r.width,
          height: r.height,
          format: r.format,
          bytes: r.bytes,
          folder: r.folder,
          context: r.context?.custom,
        })),
        nextCursor: result.next_cursor,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
