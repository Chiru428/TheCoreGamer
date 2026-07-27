import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "dummy",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "dummy",
});

/** GET /api/upload/video/[assetId] — poll Mux asset status */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { assetId } = await params;

    const asset = await prisma.videoAsset.findUnique({ where: { id: assetId } });
    if (!asset) return NextResponse.json(errorResponse("Asset not found"), { status: 404 });

    // If we have a muxAssetId, fetch live status from Mux
    if (asset.muxAssetId) {
      try {
        const muxAsset = await mux.video.assets.retrieve(asset.muxAssetId);
        // Sync status back to DB if changed
        if (muxAsset.status !== asset.status) {
          await prisma.videoAsset.update({
            where: { id: assetId },
            data: {
              status: muxAsset.status?.toUpperCase() || asset.status,
              duration: muxAsset.duration ?? undefined,
            },
          });
        }
        return NextResponse.json(
          successResponse({
            id: asset.id,
            muxAssetId: asset.muxAssetId,
            muxPlaybackId: asset.muxPlaybackId,
            status: muxAsset.status?.toUpperCase() || asset.status,
            duration: muxAsset.duration,
            title: asset.title,
          })
        );
      } catch {
        // Mux call failed — return DB state
      }
    }

    return NextResponse.json(
      successResponse({
        id: asset.id,
        muxAssetId: asset.muxAssetId,
        muxPlaybackId: asset.muxPlaybackId,
        status: asset.status,
        duration: asset.duration,
        title: asset.title,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** PATCH /api/upload/video/[assetId] — update title */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { assetId } = await params;
    const { title } = await request.json();

    const asset = await prisma.videoAsset.update({
      where: { id: assetId },
      data: { title: title || undefined },
    });

    return NextResponse.json(successResponse(asset, "Asset updated"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/** DELETE /api/upload/video/[assetId] — delete from Mux + DB */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { assetId } = await params;

    const asset = await prisma.videoAsset.findUnique({ where: { id: assetId } });
    if (!asset) return NextResponse.json(errorResponse("Asset not found"), { status: 404 });

    // Delete from Mux if we have the Mux asset ID
    if (asset.muxAssetId) {
      try {
        await mux.video.assets.delete(asset.muxAssetId);
      } catch {
        // Log but don't block DB deletion
        console.warn(`[VIDEO] Could not delete Mux asset ${asset.muxAssetId}`);
      }
    }

    await prisma.videoAsset.delete({ where: { id: assetId } });

    return NextResponse.json(successResponse(null, "Video deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
