-- FTC disclosure support: mark articles as sponsored and record the sponsor's name
ALTER TABLE "Article" ADD COLUMN "isSponsored" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "sponsorName" TEXT;
