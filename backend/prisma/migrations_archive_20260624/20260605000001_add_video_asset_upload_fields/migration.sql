-- AlterTable: add uploadId and aspectRatio columns to VideoAsset
-- uploadId: Mux Upload ID set when an upload is initiated
-- aspectRatio: e.g. "16:9", populated by the video.asset.ready webhook

ALTER TABLE "VideoAsset" ADD COLUMN "aspectRatio" TEXT;
ALTER TABLE "VideoAsset" ADD COLUMN "uploadId" TEXT;

-- CreateIndex: unique constraint on uploadId so it can be used as a lookup key
CREATE UNIQUE INDEX "VideoAsset_uploadId_key" ON "VideoAsset"("uploadId");
