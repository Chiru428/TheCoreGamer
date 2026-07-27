-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id"          TEXT        NOT NULL,
    "articleId"   TEXT,
    "gameId"      TEXT,
    "store"       TEXT        NOT NULL,
    "url"         TEXT        NOT NULL,
    "utmSource"   TEXT        NOT NULL DEFAULT 'thecoregamer',
    "utmMedium"   TEXT        NOT NULL DEFAULT 'affiliate',
    "utmCampaign" TEXT,
    "ipAddress"   TEXT        NOT NULL,
    "userAgent"   TEXT,
    "referrer"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");
CREATE INDEX "AffiliateClick_store_idx"     ON "AffiliateClick"("store");
CREATE INDEX "AffiliateClick_articleId_idx" ON "AffiliateClick"("articleId");

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
