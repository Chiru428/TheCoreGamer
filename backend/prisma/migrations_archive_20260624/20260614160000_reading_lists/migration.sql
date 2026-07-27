-- CreateTable
CREATE TABLE IF NOT EXISTS "ReadingList" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "isPublic" BOOLEAN DEFAULT false,
  slug TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "slug")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReadingListItem" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "listId" TEXT NOT NULL REFERENCES "ReadingList"(id) ON DELETE CASCADE,
  "articleId" TEXT REFERENCES "Article"(id) ON DELETE CASCADE,
  "gameId" TEXT REFERENCES "Game"(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  "addedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "ReadingListItem_content_check" CHECK ("articleId" IS NOT NULL OR "gameId" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadingList_userId_idx" ON "ReadingList"("userId");
CREATE INDEX IF NOT EXISTS "ReadingListItem_listId_idx" ON "ReadingListItem"("listId");
CREATE INDEX IF NOT EXISTS "ReadingListItem_articleId_idx" ON "ReadingListItem"("articleId");
CREATE INDEX IF NOT EXISTS "ReadingListItem_gameId_idx" ON "ReadingListItem"("gameId");
