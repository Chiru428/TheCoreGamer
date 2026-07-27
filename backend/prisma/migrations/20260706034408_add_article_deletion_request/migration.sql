-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "deletionRequestReason" VARCHAR(500),
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deletionRequestedById" TEXT;

-- CreateIndex
CREATE INDEX "Article_deletionRequestedAt_idx" ON "Article"("deletionRequestedAt");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_deletionRequestedById_fkey" FOREIGN KEY ("deletionRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
