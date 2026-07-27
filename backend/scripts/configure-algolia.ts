// One-off: apply Algolia index settings without a full reindex.
// Run with: npx tsx --env-file=.env scripts/configure-algolia.ts

import { configureIndexes } from "@/lib/algolia";
import { logger } from "@/lib/logger";

configureIndexes()
  .then(() => logger.info("[ConfigureAlgolia] Done"))
  .catch((err) => {
    logger.error({ err }, "[ConfigureAlgolia] Failed");
    process.exitCode = 1;
  });
