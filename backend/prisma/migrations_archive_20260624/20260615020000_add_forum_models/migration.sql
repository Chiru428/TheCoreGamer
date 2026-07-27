-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumBoard" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  "iconEmoji" TEXT DEFAULT '💬',
  "isGameBoard" BOOLEAN DEFAULT false,
  "gameId" TEXT REFERENCES "Game"(id) ON DELETE CASCADE,
  "threadCount" INTEGER DEFAULT 0,
  "sortOrder" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumThread" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "boardId" TEXT NOT NULL REFERENCES "ForumBoard"(id) ON DELETE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'OPEN',
  "isPinned" BOOLEAN DEFAULT false,
  "replyCount" INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  "lastActivityAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumThread_boardId_lastActivityAt_idx" ON "ForumThread"("boardId", "lastActivityAt" DESC);
CREATE INDEX IF NOT EXISTS "ForumBoard_gameId_idx" ON "ForumBoard"("gameId");
CREATE INDEX IF NOT EXISTS "ForumThread_authorId_idx" ON "ForumThread"("authorId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumReply" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "threadId" TEXT NOT NULL REFERENCES "ForumThread"(id) ON DELETE CASCADE,
  "parentId" TEXT REFERENCES "ForumReply"(id) ON DELETE SET NULL,
  "authorId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  "isHidden" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumReply_threadId_idx" ON "ForumReply"("threadId");
CREATE INDEX IF NOT EXISTS "ForumReply_authorId_idx" ON "ForumReply"("authorId");
CREATE INDEX IF NOT EXISTS "ForumReply_parentId_idx" ON "ForumReply"("parentId");
