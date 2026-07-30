import { uploadToCloudinary } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";

async function downloadImageToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getExtension(url: string): string {
  const parts = url.split("?")[0].split(".");
  const ext = parts[parts.length - 1].toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return ext;
  }
  return "jpg"; // fallback
}

/**
 * Intercepts game payload data. If it contains steam hotlinked images,
 * downloads them and uploads to Cloudinary automatically, preserving quality.
 * Mutates `data` in-place with the new Cloudinary URLs.
 * 
 * @param data The game payload data object (e.g., from the API request body)
 * @param gameId The ID of the game to use for the Cloudinary folder
 * @returns boolean indicating whether any images were intercepted and updated
 */
export async function processSteamImagesForGame(data: any, gameId: string): Promise<boolean> {
  let updated = false;

  try {
    if (data.coverImageUrl && data.coverImageUrl.includes("steamstatic.com")) {
      logger.info(`[Steam Interceptor] Auto-uploading cover image for game ${gameId}`);
      const buffer = await downloadImageToBuffer(data.coverImageUrl);
      const format = getExtension(data.coverImageUrl);
      const result = await uploadToCloudinary(buffer, {
        folder: `thecoregamer/games/${gameId}`,
        format: format === "jpeg" ? "jpg" : format
      });
      data.coverImageUrl = result.secureUrl;
      updated = true;
    }

    if (data.backgroundImageUrl && data.backgroundImageUrl.includes("steamstatic.com")) {
      logger.info(`[Steam Interceptor] Auto-uploading background image for game ${gameId}`);
      const buffer = await downloadImageToBuffer(data.backgroundImageUrl);
      const format = getExtension(data.backgroundImageUrl);
      const result = await uploadToCloudinary(buffer, {
        folder: `thecoregamer/games/${gameId}`,
        format: format === "jpeg" ? "jpg" : format
      });
      data.backgroundImageUrl = result.secureUrl;
      updated = true;
    }
  } catch (err) {
    logger.error({ err }, `[Steam Interceptor] Failed to intercept images for game ${gameId}`);
    // If it fails, we swallow the error so it doesn't break the game creation/update completely, 
    // it will just save the hotlink as a fallback.
  }

  return updated;
}
