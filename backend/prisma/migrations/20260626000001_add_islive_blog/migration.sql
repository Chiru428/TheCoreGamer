-- Add isLiveBlog and liveBlogEndedAt columns that were missed from the baseline migration
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "isLiveBlog" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "liveBlogEndedAt" TIMESTAMP(3);
