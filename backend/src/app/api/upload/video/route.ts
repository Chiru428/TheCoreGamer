import Mux from "@mux/mux-node";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { prisma } from "@/lib/prisma";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "dummy",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "dummy",
});

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { title } = await request.json();

    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        video_quality: "basic",
        normalize_audio: true,
      },
      cors_origin: "*",
    });

    const videoAsset = await prisma.videoAsset.create({
      data: {
        uploadId: upload.id,
        title: title || "",
        muxAssetId: "",
        muxPlaybackId: "",
        status: "PREPARING",
      },
    });

    return NextResponse.json(
      successResponse({
        uploadId: upload.id,
        url: upload.url, // URL for client to PUT the file
        videoAssetId: videoAsset.id,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Failed to generate upload URL"), { status: 500 });
  }
}
