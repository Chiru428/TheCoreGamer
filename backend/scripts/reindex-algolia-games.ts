import { fullReindexGames } from '../src/workers/algolia.worker';

async function main() {
  console.log("Reindexing games...");
  await fullReindexGames();
  console.log("Done reindexing games.");
}

main().catch(console.error);
