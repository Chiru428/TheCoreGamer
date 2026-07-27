import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/videos/[id]/transcript — public transcript lookup for a VideoAsset */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    const video = await withRetry(() =>
      prisma.videoAsset.findUnique({
        where: { id },
        select: { transcript: true },
      })
    );

    if (!video) return NextResponse.json(errorResponse("Video not found"), { status: 404 });

    return NextResponse.json(successResponse({ transcript: video.transcript }));
  } catch (err) {
    captureError(err, { route: "GET /api/videos/[id]/transcript" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
