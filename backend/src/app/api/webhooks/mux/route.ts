import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { addSearchIndexJob } from "@/lib/bullmq";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "dummy",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "dummy",
});
const webhookSecret = process.env.MUX_WEBHOOK_SECRET || "dummy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("mux-signature");

    if (!signature) {
      return new NextResponse("Missing Mux signature", { status: 400 });
    }

    let event;
    try {
      event = await mux.webhooks.unwrap(body, request.headers, webhookSecret);
    } catch (err) {
      return new NextResponse("Invalid Mux signature", { status: 401 });
    }

    if (event.type === "video.asset.ready") {
      const asset = event.data;
      const uploadId = asset.upload_id;

      if (uploadId) {
        const playbackId = asset.playback_ids?.[0]?.id;
        const thumbnailUrl = playbackId
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
          : undefined;
        const subtitleTrack = asset.tracks?.find((track) => track.type === "text");

        let transcript: string | undefined;
        if (asset.id) {
          try {
            const textTracksRes = await fetch(
              `https://api.mux.com/video/v1/assets/${asset.id}/text-tracks`,
              {
                headers: {
                  Authorization: `Basic ${Buffer.from(
                    `${process.env.MUX_TOKEN_ID || "dummy"}:${process.env.MUX_TOKEN_SECRET || "dummy"}`
                  ).toString("base64")}`,
                },
              }
            );
            if (textTracksRes.ok) {
              const textTracksData = await textTracksRes.json();
              transcript = textTracksData?.data?.transcript ?? textTracksData?.transcript;
            }
          } catch (err) {
            captureError(err);
          }
        }

        const updated = await prisma.videoAsset.update({
          where: { uploadId },
          data: {
            muxAssetId: asset.id,
            muxPlaybackId: playbackId,
            duration: asset.duration,
            aspectRatio: asset.aspect_ratio,
            status: "READY",
            thumbnailUrl,
            subtitleTrackId: subtitleTrack?.id,
            transcript,
          },
        });

        if (updated.articleId) {
          await addSearchIndexJob({ articleId: updated.articleId, action: "index" });
        }
      }
    } else if (event.type === "video.asset.errored") {
      const asset = event.data;
      const uploadId = asset.upload_id;
      if (uploadId) {
        await prisma.videoAsset.update({
          where: { uploadId },
          data: { status: "ERROR" },
        });
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    captureError(err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
