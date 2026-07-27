-- NOTE: Run this SQL directly in Supabase SQL editor (not via prisma migrate deploy)
-- because CONCURRENTLY cannot run inside a transaction.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "article_title_trgm_idx"
  ON "Article" USING gin(title gin_trgm_ops);
