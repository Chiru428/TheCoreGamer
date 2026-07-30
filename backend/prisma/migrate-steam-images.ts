import { PrismaClient } from "../src/generated/prisma";
import { uploadToCloudinary } from "../src/lib/cloudinary";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

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

async function main() {
  console.log("Starting Steam image migration...");

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { coverImageUrl: { contains: "steamstatic.com" } },
        { backgroundImageUrl: { contains: "steamstatic.com" } }
      ]
    }
  });

  console.log(`Found ${games.length} games to process.`);

  let processedCount = 0;
  let errorCount = 0;

  for (const game of games) {
    let updated = false;
    const dataToUpdate: any = {};

    try {
      if (game.coverImageUrl && game.coverImageUrl.includes("steamstatic.com")) {
        console.log(`[${game.slug}] Migrating cover image...`);
        const buffer = await downloadImageToBuffer(game.coverImageUrl);
        const format = getExtension(game.coverImageUrl);
        const result = await uploadToCloudinary(buffer, {
          folder: `thecoregamer/games/${game.id}`,
          format: format === "jpeg" ? "jpg" : format
        });
        dataToUpdate.coverImageUrl = result.secureUrl;
        updated = true;
      }

      if (game.backgroundImageUrl && game.backgroundImageUrl.includes("steamstatic.com")) {
        console.log(`[${game.slug}] Migrating background image...`);
        const buffer = await downloadImageToBuffer(game.backgroundImageUrl);
        const format = getExtension(game.backgroundImageUrl);
        const result = await uploadToCloudinary(buffer, {
          folder: `thecoregamer/games/${game.id}`,
          format: format === "jpeg" ? "jpg" : format
        });
        dataToUpdate.backgroundImageUrl = result.secureUrl;
        updated = true;
      }

      if (updated) {
        await prisma.game.update({
          where: { id: game.id },
          data: dataToUpdate
        });
        console.log(`[${game.slug}] Successfully updated game in database.`);
        processedCount++;
      }
    } catch (err) {
      console.error(`[${game.slug}] Failed to migrate images:`, err);
      errorCount++;
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Processed: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main()
  .catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
