-- Replace showOnHomepage boolean with homepageSlot integer (null = not shown, 1 = below News, 2 = below Mod Guides)
DROP INDEX IF EXISTS "Poll_showOnHomepage_idx";
ALTER TABLE "Poll" DROP COLUMN IF EXISTS "showOnHomepage";
ALTER TABLE "Poll" ADD COLUMN "homepageSlot" INTEGER;
CREATE INDEX "Poll_homepageSlot_idx" ON "Poll"("homepageSlot");
