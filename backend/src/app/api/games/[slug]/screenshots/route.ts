import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { auth } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { convertToWebP } from "@/lib/sharp";
import { captureError } from "@/lib/sentry";
import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_SIZE } from "@/lib/constants";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import type { Prisma } from "@/generated/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/games/[slug]/screenshots
 * Returns paginated, publicly-visible (APPROVED) user-submitted screenshots for a game.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams, 24, 50);
    const includeOfficial = searchParams.get("includeOfficial") === "1";

    const game = await withRetry(() =>
      prisma.game.findUnique({
        where: { slug },
        select: {
          id: true,
          title: true,
          screenshotUrls: true,
          artworkUrls: true,
        },
      })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    const session = await auth();
    const isModerator = session?.user?.role === "EDITOR" || session?.user?.role === "ADMIN";

    let where: Prisma.UserScreenshotWhereInput;
    if (isModerator) {
      // Moderators see screenshots of every status
      where = { gameId: game.id };
    } else if (session?.user?.id) {
      // Regular users see approved screenshots plus their own pending submissions
      where = {
        gameId: game.id,
        OR: [{ status: "APPROVED" }, { status: "PENDING", userId: session.user.id }],
      };
    } else {
      where = { gameId: game.id, status: "APPROVED" };
    }

    const [screenshots, total] = await withRetry(() =>
      Promise.all([
        prisma.userScreenshot.findMany({
          where,
          include: {
            User: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.userScreenshot.count({ where }),
      ])
    );

    // Opt-in extended shape: community screenshots plus official imagery
    // stored on the Game row. The default array shape is kept for existing
    // consumers (ScreenshotGallery).
    if (includeOfficial) {
      const official = [
        ...game.artworkUrls.map((url, i) => ({
          id: `official-artwork-${game.id}-${i}`,
          imageUrl: url,
          caption: `${game.title} — artwork`,
        })),
        ...game.screenshotUrls.map((url, i) => ({
          id: `official-screenshot-${game.id}-${i}`,
          imageUrl: url,
          caption: `${game.title} — screenshot`,
        })),
      ].filter(Boolean);

      return NextResponse.json(
        successResponse(
          { screenshots, official },
          undefined,
          buildPaginationMeta(page, limit, total)
        )
      );
    }

    return NextResponse.json(
      successResponse(screenshots, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * POST /api/games/[slug]/screenshots
 * Authenticated users submit a screenshot for moderation (status starts PENDING).
 * Body: multipart/form-data with `image` (file) and optional `caption`.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { slug } = await params;
    const game = await withRetry(() =>
      prisma.game.findUnique({ where: { slug }, select: { id: true } })
    );
    if (!game) {
      return NextResponse.json(errorResponse("Game not found"), { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const captionRaw = formData.get("caption");
    const caption = typeof captionRaw === "string" ? captionRaw.trim().slice(0, 300) : "";

    if (!file) return NextResponse.json(errorResponse("No image provided"), { status: 400 });
    if (file.size > MAX_IMAGE_SIZE)
      return NextResponse.json(errorResponse("Image too large (max 10MB)"), { status: 400 });

    // Validate MIME type via magic bytes
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileTypeFromBuffer } = await import("file-type");
    const type = await fileTypeFromBuffer(buffer);
    if (!type || !ALLOWED_IMAGE_MIMES.includes(type.mime)) {
      return NextResponse.json(errorResponse("Invalid image type"), { status: 400 });
    }

    const webpImage = await convertToWebP(buffer, 85);
    const result = await uploadToCloudinary(webpImage.buffer, {
      folder: `thecoregamer/screenshots/${game.id}`,
      format: "webp",
    });

    const screenshot = await withRetry(() =>
      prisma.userScreenshot.create({
        data: {
          gameId: game.id,
          userId: session!.user.id,
          imageUrl: result.secureUrl,
          caption: caption || null,
        },
      })
    );

    return NextResponse.json(
      successResponse(
        screenshot,
        "Screenshot submitted for review — it will appear once approved by a moderator"
      ),
      { status: 201 }
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
