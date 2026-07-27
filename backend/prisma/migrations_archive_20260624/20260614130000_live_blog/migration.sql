-- AlterTable
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "isLiveBlog" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "liveBlogEndedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LiveBlogUpdate" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiveBlogUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveBlogUpdate_articleId_publishedAt_idx" ON "LiveBlogUpdate"("articleId", "publishedAt" DESC);

-- AddForeignKey
ALTER TABLE "LiveBlogUpdate" ADD CONSTRAINT "LiveBlogUpdate_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBlogUpdate" ADD CONSTRAINT "LiveBlogUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
