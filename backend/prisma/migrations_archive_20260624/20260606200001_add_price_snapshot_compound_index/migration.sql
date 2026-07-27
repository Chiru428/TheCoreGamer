-- Compound index for efficient upsert deduplication lookups in deals.worker.ts
-- WHERE gameId = ? AND shop = ? AND recordedAt >= ?
CREATE INDEX IF NOT EXISTS "PriceSnapshot_gameId_shop_recordedAt_idx"
  ON "PriceSnapshot"("gameId", "shop", "recordedAt");
