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
    let nextCursor = request.nextUrl.searchParams.get("cursor") || undefined;

    const filteredResources: any[] = [];
    let attempts = 0;

    // Fetch until we have at least 50 items (or up to 5 API calls) to ensure
    // the media library doesn't appear empty after filtering out responsive variants.
    while (filteredResources.length < 50 && attempts < 5) {
      const result = await listCloudinaryAssets({
        prefix: search ? `${folder}/${search}` : folder,
        folder,
        altText,
        maxResults: 100,
        nextCursor,
      });

      const valid = result.resources.filter((r: any) => {
        const isSrcSetFolder = r.folder?.endsWith("/srcset");
        const isSrcSetFile = /-\d+w$/.test(r.public_id);
        const isAvif = r.format === "avif";
        return !isSrcSetFolder && !isSrcSetFile && !isAvif;
      });

      filteredResources.push(...valid);
      nextCursor = result.next_cursor;
      
      if (!nextCursor) break;
      attempts++;
    }

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
        nextCursor: nextCursor,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
