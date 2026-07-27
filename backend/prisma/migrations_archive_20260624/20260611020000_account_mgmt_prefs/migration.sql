-- AlterTable: 30-day username change cooldown tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usernameChangedAt" TIMESTAMP(3);

-- AlterTable: per-alert-type notification preferences (default opted-in)
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "priceAlerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "esportsResults" BOOLEAN NOT NULL DEFAULT true;
