-- Documents a column rename that was already applied directly to the
-- database (PriceSnapshot.priceUSD -> priceINR, Wishlist.targetPriceUSD ->
-- targetPriceINR), to bring migration history back in sync with the live
-- schema and schema.prisma. This migration is marked as applied via
-- `prisma migrate resolve` rather than run, since the live database already
-- has the renamed columns.

-- AlterTable
ALTER TABLE "PriceSnapshot" RENAME COLUMN "priceUSD" TO "priceINR";

-- AlterTable
ALTER TABLE "Wishlist" RENAME COLUMN "targetPriceUSD" TO "targetPriceINR";
