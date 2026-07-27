-- AlterTable
ALTER TABLE "Franchise" ADD COLUMN     "articleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bannerImageUrl" TEXT,
ADD COLUMN     "igdbId" INTEGER,
ADD COLUMN     "logoImageUrl" TEXT;

-- CreateTable
CREATE TABLE "FranchiseGame" (
    "franchiseId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "FranchiseGame_pkey" PRIMARY KEY ("franchiseId","gameId")
);

-- AddForeignKey
ALTER TABLE "FranchiseGame" ADD CONSTRAINT "FranchiseGame_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseGame" ADD CONSTRAINT "FranchiseGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
