-- Add helpful/not-helpful counters to ModGuide
ALTER TABLE "ModGuide" ADD COLUMN "helpfulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ModGuide" ADD COLUMN "notHelpfulCount" INTEGER NOT NULL DEFAULT 0;

-- Create ModGuideVote table
CREATE TABLE "ModGuideVote" (
    "id"         TEXT NOT NULL,
    "modGuideId" TEXT NOT NULL,
    "userId"     TEXT,
    "sessionId"  TEXT,
    "value"      INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModGuideVote_pkey" PRIMARY KEY ("id")
);

-- Unique constraints (NULL values are treated as distinct in PostgreSQL unique indexes)
CREATE UNIQUE INDEX "ModGuideVote_modGuideId_userId_key" ON "ModGuideVote"("modGuideId", "userId");
CREATE UNIQUE INDEX "ModGuideVote_modGuideId_sessionId_key" ON "ModGuideVote"("modGuideId", "sessionId");
CREATE INDEX "ModGuideVote_modGuideId_idx" ON "ModGuideVote"("modGuideId");

-- Foreign keys
ALTER TABLE "ModGuideVote" ADD CONSTRAINT "ModGuideVote_modGuideId_fkey"
    FOREIGN KEY ("modGuideId") REFERENCES "ModGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModGuideVote" ADD CONSTRAINT "ModGuideVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
