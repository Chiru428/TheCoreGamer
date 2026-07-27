-- Platform-specific review scores
CREATE TABLE "ReviewScorePlatform" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "gameplay" DOUBLE PRECISION,
  "visuals" DOUBLE PRECISION,
  "story" DOUBLE PRECISION,
  "performance" DOUBLE PRECISION,
  "value" DOUBLE PRECISION,
  "overall" DOUBLE PRECISION NOT NULL,
  "notes" VARCHAR(500),
  CONSTRAINT "ReviewScorePlatform_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewScorePlatform_reviewId_platform_key" UNIQUE ("reviewId", "platform")
);
CREATE INDEX "ReviewScorePlatform_reviewId_idx" ON "ReviewScorePlatform"("reviewId");
ALTER TABLE "ReviewScorePlatform" ADD CONSTRAINT "ReviewScorePlatform_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Score change history
CREATE TABLE "ReviewScoreHistory" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "oldScore" DOUBLE PRECISION NOT NULL,
  "newScore" DOUBLE PRECISION NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedById" TEXT,
  CONSTRAINT "ReviewScoreHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReviewScoreHistory_reviewId_idx" ON "ReviewScoreHistory"("reviewId");
CREATE INDEX "ReviewScoreHistory_changedAt_idx" ON "ReviewScoreHistory"("changedAt");
ALTER TABLE "ReviewScoreHistory" ADD CONSTRAINT "ReviewScoreHistory_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewScoreHistory" ADD CONSTRAINT "ReviewScoreHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Disclosure fields
ALTER TABLE "GameReview" ADD COLUMN IF NOT EXISTS "copyProvidedByPublisher" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameReview" ADD COLUMN IF NOT EXISTS "platformsTested" TEXT[] NOT NULL DEFAULT '{}';
