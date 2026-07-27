import "dotenv/config";
import { prisma } from "./src/lib/prisma.ts";
import { syncGame } from "./src/workers/algolia.worker.ts";

async function run() {
  const games = await prisma.game.findMany({ select: { id: true } });
  let count = 0;
  for (const game of games) {
    await syncGame(game.id);
    count++;
    if (count % 100 === 0) console.log(`Synced ${count}/${games.length}`);
  }
  console.log("Done syncing games!");
  process.exit(0);
}

run();
