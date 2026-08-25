import "dotenv/config";
import { prisma } from './src/lib/prisma';
import { searchIGDB, getIGDBGame, mapIGDBGameToDb } from './src/lib/igdb';
import { uploadToCloudinary } from './src/lib/cloudinary';
import { syncGame } from './src/workers/algolia.worker';
import { generateUniqueSlug } from './src/lib/slug';

const gamesToAdd = [
  "Grand Theft Auto III",
  "Grand Theft Auto: Vice City",
  "Grand Theft Auto: San Andreas",
  "Bully",
  "L.A. Noire",
  "Red Dead Revolver",
  "Saints Row",
  "Saints Row 2",
  "Saints Row: The Third",
  "Saints Row IV",
  "Prototype",
  "Prototype 2",
  "Far Cry",
  "Far Cry 2",
  "Far Cry 3",
  "Far Cry 3: Blood Dragon",
  "Far Cry 4",
  "Far Cry 5",
  "Far Cry 6",
  "Far Cry: New Dawn",
  "Just Cause",
  "Just Cause 2",
  "Just Cause 3",
  "The Saboteur",
  "Mafia",
  "Mafia II",
  "Mafia III",
  "Mafia: Definitive Edition",
  "Watch Dogs",
  "Max Payne",
  "Max Payne 2: The Fall of Max Payne",
  "Max Payne 3",
  "Driver: San Francisco",
  "The Warriors",
  "Scarface: The World Is Yours",
  "Need for Speed",
  "Need for Speed: Underground",
  "Need for Speed: Underground 2",
  "Need for Speed: Most Wanted",
  "Need for Speed: Carbon",
  "Need for Speed: ProStreet",
  "Need for Speed: Hot Pursuit",
  "Need for Speed: Shift",
  "Need for Speed: Shift 2 Unleashed",
  "Need for Speed: The Run",
  "Need for Speed: Rivals",
  "Need for Speed: Payback",
  "Need for Speed: Heat",
  "Burnout",
  "Burnout 3: Takedown",
  "Burnout Revenge",
  "Burnout Paradise",
  "Midnight Club 3: DUB Edition",
  "Midnight Club: Los Angeles",
  "Gran Turismo",
  "Gran Turismo 2",
  "Gran Turismo 3: A-Spec",
  "Gran Turismo 4",
  "Gran Turismo 5",
  "Gran Turismo 6",
  "Gran Turismo Sport",
  "Gran Turismo 7",
  "Project CARS",
  "Project CARS 3",
  "DiRT",
  "DiRT 2",
  "DiRT 3",
  "DiRT 4",
  "GRID",
  "GRID 2",
  "GRID Autosport",
  "GRID Legends",
  "Test Drive Unlimited",
  "Test Drive Unlimited 2",
  "Wreckfest",
  "Wreckfest 2",
  "7 Days to Die",
  "Project Zomboid",
  "ARK: Survival Evolved",
  "SCUM",
  "Soulmask",
  "Nightingale",
  "Warhammer: Vermintide 2",
  "Killing Floor 2",
  "Killing Floor 3",
  "Back 4 Blood",
  "World War Z",
  "GTFO",
  "Human: Fall Flat",
  "Unravel Two",
  "Monster Hunter Rise",
  "Borderlands",
  "Borderlands 3"
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
