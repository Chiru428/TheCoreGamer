-- Migration: Remove ESPORTS from ContentType enum
--
-- PostgreSQL does not support DROP VALUE from an enum directly.
-- Steps:
--   1. Reassign any existing ESPORTS articles to NEWS (safe default).
--   2. Create a new enum without ESPORTS.
--   3. Swap the column to use the new enum.
--   4. Drop the old enum.

-- Step 1: Reassign existing ESPORTS articles to NEWS
UPDATE "Article" SET "contentType" = 'NEWS' WHERE "contentType" = 'ESPORTS';

-- Step 2: Create new enum without ESPORTS
CREATE TYPE "ContentType_new" AS ENUM (
  'NEWS',
  'REVIEW',
  'MOD_GUIDE',
  'WALKTHROUGH',
  'OPINION',
  'DEAL',
  'FEATURE',
  'LISTICLE'
);

-- Step 3: Alter the column to use the new enum
ALTER TABLE "Article"
  ALTER COLUMN "contentType" TYPE "ContentType_new"
  USING ("contentType"::text::"ContentType_new");

-- Step 4: Drop the old enum and rename the new one
DROP TYPE "ContentType";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
