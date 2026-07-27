CREATE TABLE "UserTeamFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamSlug" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTeamFollow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserTeamFollow_teamSlug_idx" ON "UserTeamFollow"("teamSlug");
CREATE UNIQUE INDEX "UserTeamFollow_userId_teamSlug_key" ON "UserTeamFollow"("userId", "teamSlug");

ALTER TABLE "UserTeamFollow" ADD CONSTRAINT "UserTeamFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
