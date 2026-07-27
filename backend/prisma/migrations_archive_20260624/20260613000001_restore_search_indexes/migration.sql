-- Restore search indexes dropped by drift correction
CREATE INDEX IF NOT EXISTS "article_search_gin_idx" ON "Article" USING gin("searchVector");
CREATE INDEX IF NOT EXISTS "article_title_trgm_idx" ON "Article" USING gist ("title" gist_trgm_ops);
