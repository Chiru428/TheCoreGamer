CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "body" VARCHAR(1000),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserRatingVote" (
    "id" TEXT NOT NULL,
    "userRatingId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "UserRatingVote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(200) NOT NULL,
    "articleId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" VARCHAR(100) NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserContentPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followedGenres" TEXT[],
    "followedPlatforms" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserContentPreference_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserRating_gameId_idx" ON "UserRating"("gameId");
CREATE INDEX "UserRating_userId_idx" ON "UserRating"("userId");
CREATE UNIQUE INDEX "UserRating_userId_gameId_key" ON "UserRating"("userId", "gameId");
CREATE INDEX "UserRatingVote_userRatingId_idx" ON "UserRatingVote"("userRatingId");
CREATE UNIQUE INDEX "UserRatingVote_userRatingId_voterId_key" ON "UserRatingVote"("userRatingId", "voterId");
CREATE INDEX "Poll_articleId_idx" ON "Poll"("articleId");
CREATE INDEX "Poll_isActive_idx" ON "Poll"("isActive");
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");
CREATE UNIQUE INDEX "PollVote_pollId_sessionId_key" ON "PollVote"("pollId", "sessionId");
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");
CREATE UNIQUE INDEX "UserContentPreference_userId_key" ON "UserContentPreference"("userId");
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRatingVote" ADD CONSTRAINT "UserRatingVote_userRatingId_fkey" FOREIGN KEY ("userRatingId") REFERENCES "UserRating"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRatingVote" ADD CONSTRAINT "UserRatingVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserContentPreference" ADD CONSTRAINT "UserContentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
