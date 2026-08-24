import "dotenv/config";
import { prisma } from './src/lib/prisma';
import { searchIGDB, getIGDBGame, mapIGDBGameToDb } from './src/lib/igdb';
import { uploadToCloudinary } from './src/lib/cloudinary';
import { syncGame } from './src/workers/algolia.worker';
import { generateUniqueSlug } from './src/lib/slug';

const gamesToAdd = [
  "Dark Souls",
  "Dark Souls Remastered",
  "Dark Souls II",
  "Dark Souls III",
  "Demon's Souls",
  "Nioh",
  "Nioh 2",
  "Wo Long: Fallen Dynasty",
  "Code Vein",
  "Mortal Shell",
  "Thymesia",
  "Steelrising",
  "The Surge",
  "The Surge 2",
  "Ashen",
  "Blasphemous",
  "Blasphemous 2",
  "Salt and Sanctuary",
  "Salt and Sacrifice",
  "Remnant: From the Ashes",
  "Hellpoint",
  "Bleak Faith: Forsaken",
  "Another Crab's Treasure",
  "Enotria: The Last Song",
  "Rise of the Ronin",
  "Resident Evil",
  "Resident Evil 0",
  "Resident Evil 3",
  "Resident Evil 5",
  "Resident Evil 6",
  "Resident Evil Revelations",
  "Resident Evil Revelations 2",
  "Silent Hill",
  "Silent Hill 3",
  "Silent Hill 4: The Room",
  "Silent Hill: Downpour",
  "Dead Space",
  "Dead Space 3",
  "Amnesia: A Machine for Pigs",
  "Outlast Trials",
  "The Medium",
  "Layers of Fear",
  "Layers of Fear 2",
  "Little Nightmares",
  "Tormented Souls",
  "Tormented Souls 2",
  "Observer",
  "The Mortuary Assistant"
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  // IGDB urls sometimes start with //images.igdb.com
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  for (const title of gamesToAdd) {
    console.log(`\nProcessing: ${title}`);
    const existing = await prisma.game.findFirst({ where: { title: { equals: title, mode: 'insensitive' } } });
    if (existing) {
      console.log(`-> Already exists in DB: ${title}`);
      continue;
    }

    try {
      const searchResults = await searchIGDB(title);
      if (searchResults.length === 0) {
        console.log(`-> Not found on IGDB: ${title}`);
        continue;
      }
      
      const igdbId = searchResults[0].id;
      const igdbGame = await getIGDBGame(igdbId);
      const dbGameData = mapIGDBGameToDb(igdbGame) as any;

      const slug = await generateUniqueSlug(title, "game");
      dbGameData.slug = slug;

      // Upload images to Cloudinary
      if (dbGameData.coverImageUrl) {
        try {
          const buffer = await fetchImageBuffer(dbGameData.coverImageUrl);
          const upload = await uploadToCloudinary(buffer, { folder: 'games/covers' });
          dbGameData.coverImageUrl = upload.secureUrl;
          console.log(`-> Uploaded cover`);
        } catch (e) {
          console.error(`-> Failed to upload cover:`, e);
        }
      }
      
      if (dbGameData.backgroundImageUrl) {
        try {
          const buffer = await fetchImageBuffer(dbGameData.backgroundImageUrl);
          const upload = await uploadToCloudinary(buffer, { folder: 'games/backgrounds' });
          dbGameData.backgroundImageUrl = upload.secureUrl;
          console.log(`-> Uploaded background`);
        } catch (e) {
          console.error(`-> Failed to upload background:`, e);
        }
      }

      const created = await prisma.game.create({
        data: dbGameData
      });
      console.log(`-> Created game: ${title} (ID: ${created.id})`);
      
      try {
        await syncGame(created.id);
        console.log(`-> Synced to Algolia`);
      } catch (err) {
        console.error(`-> Failed to sync to Algolia:`, err);
      }
      
      await delay(500); // polite delay
    } catch (error) {
      console.error(`-> Error processing ${title}:`, error);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
