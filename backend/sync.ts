import "dotenv/config";
import { configureIndexes } from "./src/lib/algolia";

async function run() {
  await configureIndexes();
  console.log("Done");
  process.exit(0);
}

run();
