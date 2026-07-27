-- Add multi-select support and a denormalized distinct-voter count to Poll
ALTER TABLE "Poll" ADD COLUMN "allowMultiple" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Poll" ADD COLUMN "voterCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill voterCount from existing votes (distinct voter per poll)
UPDATE "Poll" p
SET "voterCount" = sub.cnt
FROM (
  SELECT "pollId", COUNT(DISTINCT COALESCE("userId", "sessionId")) AS cnt
  FROM "PollVote"
  GROUP BY "pollId"
) sub
WHERE p.id = sub."pollId";

-- Replace one-vote-per-poll uniqueness with one-vote-per-option uniqueness,
-- so a voter can select multiple options on polls with allowMultiple = true
DROP INDEX "PollVote_pollId_userId_key";
DROP INDEX "PollVote_pollId_sessionId_key";
CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON "PollVote"("pollId", "userId", "optionId");
CREATE UNIQUE INDEX "PollVote_pollId_sessionId_optionId_key" ON "PollVote"("pollId", "sessionId", "optionId");
