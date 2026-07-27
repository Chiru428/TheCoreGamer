-- AlterTable: add showOnHomepage flag to Poll
ALTER TABLE "Poll" ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Poll_showOnHomepage_idx" ON "Poll"("showOnHomepage");
