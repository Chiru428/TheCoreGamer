-- DropForeignKey
ALTER TABLE "GameReview" DROP CONSTRAINT "GameReview_gameId_fkey";

-- AlterTable
ALTER TABLE "AffiliateClick" ALTER COLUMN "utmSource" SET DEFAULT 'thecoregamer';

-- AlterTable
ALTER TABLE "Badge" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "NewsletterSend" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "PointTransaction" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "ReadingList" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "ReadingListItem" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "UserBadge" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AddForeignKey
ALTER TABLE "GameReview" ADD CONSTRAINT "GameReview_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

