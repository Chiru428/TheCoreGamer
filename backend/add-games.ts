import "dotenv/config";
import { prisma } from './src/lib/prisma';
import { searchIGDB, getIGDBGame, mapIGDBGameToDb } from './src/lib/igdb';
import { uploadToCloudinary } from './src/lib/cloudinary';
import { syncGame } from './src/workers/algolia.worker';
import { generateUniqueSlug } from './src/lib/slug';

const gamesToAdd = [
  "Super Mario Galaxy",
  "Super Mario Galaxy 2",
  "Super Mario 3D World",
  "Super Mario 3D Land",
  "New Super Mario Bros. Wii",
  "New Super Mario Bros. U Deluxe",
  "Mario Kart 8 Deluxe",
  "Mario Kart Wii",
  "Mario Kart 7",
  "Mario Kart DS",
  "The Legend of Zelda: Ocarina of Time",
  "The Legend of Zelda: Majora's Mask",
  "The Legend of Zelda: The Wind Waker",
  "The Legend of Zelda: Twilight Princess",
  "The Legend of Zelda: Skyward Sword HD",
  "The Legend of Zelda: Link's Awakening",
  "The Legend of Zelda: A Link Between Worlds",
  "Metroid Prime",
  "Metroid Prime Remastered",
  "Metroid Prime 2: Echoes",
  "Metroid Prime 3: Corruption",
  "Metroid Prime 4: Beyond",
  "Luigi's Mansion",
  "Luigi's Mansion 2 HD",
  "Luigi's Mansion 3",
  "Pikmin 3",
  "Pikmin 4",
  "Kirby and the Forgotten Land",
  "Fire Emblem: Three Houses",
  "Fire Emblem Engage",
  "Pokémon Legends: Arceus",
  "Pokémon Scarlet",
  "Pokémon Violet",
  "Pokémon Sword",
  "Pokémon Shield",
  "Pokémon Legends: Z-A",
  "Xenoblade Chronicles",
  "Xenoblade Chronicles 2",
  "Xenoblade Chronicles X",
  "Bayonetta",
  "Bayonetta 2",
  "Bayonetta 3",
  "Splatoon 3",
  "Donkey Kong Country: Tropical Freeze",
  "Paper Mario: The Thousand-Year Door",
  "Paper Mario: The Origami King",
  "Super Mario RPG"
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
