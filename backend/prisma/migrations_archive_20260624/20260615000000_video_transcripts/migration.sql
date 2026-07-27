-- AlterTable
ALTER TABLE "VideoAsset" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
ALTER TABLE "VideoAsset" ADD COLUMN IF NOT EXISTS "subtitleTrackId" TEXT;
ALTER TABLE "VideoAsset" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
