-- User-submitted screenshot moderation queue
CREATE TYPE "UserScreenshotStatus" AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE "UserScreenshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "status" "UserScreenshotStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserScreenshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserScreenshot_gameId_idx" ON "UserScreenshot"("gameId");
CREATE INDEX "UserScreenshot_userId_idx" ON "UserScreenshot"("userId");
CREATE INDEX "UserScreenshot_status_idx" ON "UserScreenshot"("status");

ALTER TABLE "UserScreenshot" ADD CONSTRAINT "UserScreenshot_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserScreenshot" ADD CONSTRAINT "UserScreenshot_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
