-- DROP TABLE ... CASCADE removes dependent foreign-key constraints automatically,
-- so this is safe to replay even against a fresh shadow database where these
-- tables (and their constraints) were never created.
DROP TABLE IF EXISTS "Wishlist" CASCADE;
DROP TABLE IF EXISTS "PriceAlert" CASCADE;

ALTER TABLE "NotificationPreference" DROP COLUMN IF EXISTS "priceAlerts";
