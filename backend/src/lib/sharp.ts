import sharpModule from "sharp";

// Standard widths for srcset generation
const SRCSET_WIDTHS = [320, 640, 960, 1280, 1920];

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface SrcSetImage {
  buffer: Buffer;
  width: number;
  filename: string;
}

/**
 * Convert image to WebP at 85% quality
 */
export async function convertToWebP(input: Buffer, quality: number = 85): Promise<ProcessedImage> {
  const result = sharpModule(input).webp({ quality });
  const buffer = await result.toBuffer();
  const metadata = await sharpModule(buffer).metadata();

  return {
    buffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: "webp",
    size: buffer.length,
  };
}

/**
 * Generate multiple sizes for srcset
 */
export async function generateSrcSet(
  input: Buffer,
  baseName: string,
  quality: number = 85
): Promise<SrcSetImage[]> {
  const metadata = await sharpModule(input).metadata();
  const originalWidth = metadata.width || 1920;

  const results: SrcSetImage[] = [];

  for (const width of SRCSET_WIDTHS) {
    // Don't upscale
    if (width > originalWidth) continue;

    const buffer = await sharpModule(input)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    results.push({
      buffer,
      width,
      filename: `${baseName}-${width}w.webp`,
    });
  }

  return results;
}

/**
 * Get image metadata
 */
export async function getImageMetadata(input: Buffer) {
  return sharpModule(input).metadata();
}

/**
 * Resize image to max dimensions
 */
export async function resizeImage(
  input: Buffer,
  maxWidth: number,
  maxHeight?: number,
  quality: number = 85
): Promise<Buffer> {
  return sharpModule(input)
    .resize(maxWidth, maxHeight, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality })
    .toBuffer();
}

export { sharpModule as sharp };
export default sharpModule;
