import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { convertToWebP, generateSrcSet } from "@/lib/sharp";
import { captureError } from "@/lib/sentry";
import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_SIZE } from "@/lib/constants";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const folder = formData.get("folder") as string | null;
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

    // Convert to WebP
    const webpImage = await convertToWebP(buffer, 85);

    // Generate srcset variants
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const srcSetImages = await generateSrcSet(buffer, baseName, 85);

    // Upload main image
    const mainResult = await uploadToCloudinary(webpImage.buffer, {
      folder: `thecoregamer/${session!.user.id}${folder ? `/${folder}` : ""}`,
      format: "webp",
    });

    // Upload srcset variants
    const srcset: Record<string, string> = {};
    for (const img of srcSetImages) {
      const result = await uploadToCloudinary(img.buffer, {
        folder: `thecoregamer/${session!.user.id}${folder ? `/${folder}` : ""}/srcset`,
        publicId: img.filename.replace(".webp", ""),
        format: "webp",
      });
      srcset[`${img.width}w`] = result.secureUrl;
    }

    // Convert to AVIF (alongside WebP)
    const { default: sharp } = await import("sharp");
    const avifBuffer = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .toFormat("avif", { quality: 70, effort: 6 })
      .toBuffer();

    // Upload AVIF to Cloudinary
    const avifResult = await uploadToCloudinary(avifBuffer, {
      folder: `thecoregamer/${session!.user.id}${folder ? `/${folder}` : ""}`,
      format: "avif",
    });

    return NextResponse.json(
      successResponse(
        {
          url: mainResult.secureUrl, // WebP — default
          avifUrl: avifResult.secureUrl, // AVIF — for modern browsers
          publicId: mainResult.publicId,
          width: mainResult.width,
          height: mainResult.height,
          format: mainResult.format,
          bytes: mainResult.bytes,
          srcset,
        },
        "Image uploaded"
      ),
      { status: 201 }
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
