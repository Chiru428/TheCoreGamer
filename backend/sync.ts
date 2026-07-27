import "dotenv/config";
import { configureIndexes } from "./src/lib/algolia.ts";

async function run() {
  await configureIndexes();
  console.log("Done");
  process.exit(0);
}

run();
