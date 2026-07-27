-- Rename free-text compatibility field, then add structured version-tracking columns
ALTER TABLE "ModGuide" RENAME COLUMN "gameVersionCompatibility" TO "gameVersionNotes";

ALTER TABLE "ModGuide" ADD COLUMN "gameVersion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ModGuide" ADD COLUMN "gameVersionDate" TIMESTAMP(3);
ALTER TABLE "ModGuide" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);
ALTER TABLE "ModGuide" ADD COLUMN "lastVerifiedVersion" TEXT;
ALTER TABLE "ModGuide" ADD COLUMN "lastVerifiedById" TEXT;
ALTER TABLE "ModGuide" ADD COLUMN "compatibilityNotes" VARCHAR(500);

-- Foreign key for the editor who last verified the guide
ALTER TABLE "ModGuide" ADD CONSTRAINT "ModGuide_lastVerifiedById_fkey"
    FOREIGN KEY ("lastVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
