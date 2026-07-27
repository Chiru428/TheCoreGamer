-- AlterTable
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "rootId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_rootId_idx" ON "Comment"("rootId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
