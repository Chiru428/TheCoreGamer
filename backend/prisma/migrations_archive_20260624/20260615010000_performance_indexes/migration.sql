-- Performance indexes for high-traffic query patterns

-- Article list filtered by contentType and sorted by publishedAt (homepage/section feeds)
CREATE INDEX IF NOT EXISTS "Article_contentType_publishedAt_idx" ON "Article"("contentType", "publishedAt");

-- GameReview lookups by gameId (game hub "reviews" tab, review score aggregation)
CREATE INDEX IF NOT EXISTS "GameReview_gameId_idx" ON "GameReview"("gameId");

-- AffiliateClick analytics filtered by store and ordered by createdAt
CREATE INDEX IF NOT EXISTS "AffiliateClick_createdAt_store_idx" ON "AffiliateClick"("createdAt", "store");
