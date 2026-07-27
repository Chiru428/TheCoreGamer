-- DropForeignKey
ALTER TABLE "PointTransaction" DROP CONSTRAINT "PointTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserBadge" DROP CONSTRAINT "UserBadge_badgeId_fkey";

-- DropForeignKey
ALTER TABLE "UserBadge" DROP CONSTRAINT "UserBadge_userId_fkey";

-- AlterTable
ALTER TABLE "Article" DROP COLUMN "communitySubmitterNote",
DROP COLUMN "isCommunityContent";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "points";

-- DropTable
DROP TABLE "Badge";

-- DropTable
DROP TABLE "PointTransaction";

-- DropTable
DROP TABLE "UserBadge";

