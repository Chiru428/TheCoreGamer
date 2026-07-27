-- GIN index for full-text tsvector search on Article.searchVector
-- CONCURRENTLY means no table lock; safe to run on live production data.
-- If running manually on a large table, run this SQL directly in psql
-- rather than via prisma migrate deploy (which wraps in a transaction,
-- and CONCURRENTLY cannot run inside a transaction).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "article_search_gin_idx"
  ON "Article" USING gin("searchVector");
