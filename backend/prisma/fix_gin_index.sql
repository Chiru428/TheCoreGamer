-- fix_gin_index.sql
-- =============================================================================
-- USAGE: Run this ONLY if the Prisma migration
--        20260606200000_add_search_gin_index fails with a "GIN index already
--        exists" error (e.g. after a botched partial migration).
--
-- This script drops the conflicting index so the migration can re-create it
-- cleanly. It is idempotent — safe to run multiple times.
--
-- Do NOT run this as part of normal deployments or CI.
-- The standard migration path (prisma migrate deploy) handles GIN indexes
-- automatically.
-- =============================================================================

-- NOTE: This file is superseded by migration 20260606200000_add_search_gin_index.
-- It is kept for reference only. Do not run manually.
CREATE INDEX IF NOT EXISTS article_search_gin_idx ON "Article" USING gin("searchVector");
