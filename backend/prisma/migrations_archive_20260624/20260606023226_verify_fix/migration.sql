CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "priceUSD" DECIMAL(10,2) NOT NULL,
    "cutPercent" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "targetPriceUSD" DECIMAL(10,2),
    "notifyOnAnyDrop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PriceSnapshot_gameId_idx" ON "PriceSnapshot"("gameId");
CREATE INDEX "PriceSnapshot_gameId_recordedAt_idx" ON "PriceSnapshot"("gameId", "recordedAt");
CREATE INDEX "PriceSnapshot_recordedAt_idx" ON "PriceSnapshot"("recordedAt");
CREATE INDEX "Wishlist_userId_idx" ON "Wishlist"("userId");
CREATE INDEX "Wishlist_gameId_idx" ON "Wishlist"("gameId");
CREATE UNIQUE INDEX "Wishlist_userId_gameId_key" ON "Wishlist"("userId", "gameId");
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
