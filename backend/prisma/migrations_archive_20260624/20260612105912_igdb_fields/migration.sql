-- DropIndex
DROP INDEX "article_search_gin_idx";

-- DropIndex
DROP INDEX "article_title_trgm_idx";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "dlcOfId" TEXT,
ADD COLUMN     "gameEdition" TEXT DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "winnerGameId" TEXT,
    "nomineesJson" JSONB DEFAULT '[]',
    "editorPickId" TEXT,
    "isVotingOpen" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardVote" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "awardId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AwardVote_awardId_userId_key" ON "AwardVote"("awardId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardVote_awardId_sessionId_key" ON "AwardVote"("awardId", "sessionId");

-- CreateIndex
CREATE INDEX "Game_dlcOfId_idx" ON "Game"("dlcOfId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_dlcOfId_fkey" FOREIGN KEY ("dlcOfId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_winnerGameId_fkey" FOREIGN KEY ("winnerGameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_editorPickId_fkey" FOREIGN KEY ("editorPickId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardVote" ADD CONSTRAINT "AwardVote_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardVote" ADD CONSTRAINT "AwardVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
