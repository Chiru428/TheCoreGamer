import { configureIndexes } from '../src/lib/algolia';

async function main() {
  console.log("Configuring Algolia indexes...");
  await configureIndexes();
  console.log("Done configuring Algolia indexes.");
}

main().catch(console.error);
