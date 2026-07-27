-- Add immutable first-publish timestamp
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "originallyPublishedAt" TIMESTAMP(3);

-- Back-fill from publishedAt for all already-published articles
UPDATE "Article"
SET "originallyPublishedAt" = "publishedAt"
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "originallyPublishedAt" IS NULL;

-- Add IN_PROGRESS to the enum (Postgres requires this specific syntax)
ALTER TYPE "ArticleStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS' BEFORE 'IN_REVIEW';
