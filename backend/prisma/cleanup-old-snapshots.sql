-- ============================================================
-- One-time cleanup: delete all PriceSnapshot rows older than
-- 5 days (today inclusive = 120 hours rolling window).
--
-- Run this once in Supabase SQL Editor to purge existing
-- stale data. Going forward, the cleanup.worker runs daily
-- at 2 AM UTC to keep the table clean automatically.
-- ============================================================

-- Step 1: Preview how many rows will be deleted (safe, read-only)
SELECT COUNT(*) AS rows_to_delete
FROM "PriceSnapshot"
WHERE "recordedAt" < NOW() - INTERVAL '5 days';

-- Step 2: Delete them (run after confirming the count above)
DELETE FROM "PriceSnapshot"
WHERE "recordedAt" < NOW() - INTERVAL '5 days';

-- Step 3: Reclaim the disk space PostgreSQL reserved for deleted rows
VACUUM ANALYZE "PriceSnapshot";

-- Step 4: Verify final state
SELECT
  COUNT(*)                          AS total_rows,
  MIN("recordedAt")                 AS oldest_snapshot,
  MAX("recordedAt")                 AS newest_snapshot,
  pg_size_pretty(
    pg_total_relation_size('"PriceSnapshot"')
  )                                 AS table_size;
