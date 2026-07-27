CREATE TABLE "UserStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserStrike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserStrike_userId_idx" ON "UserStrike"("userId");
CREATE INDEX "UserStrike_issuedAt_idx" ON "UserStrike"("issuedAt");

CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "ModerationLog"("targetType", "targetId");

ALTER TABLE "UserStrike" ADD CONSTRAINT "UserStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStrike" ADD CONSTRAINT "UserStrike_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
