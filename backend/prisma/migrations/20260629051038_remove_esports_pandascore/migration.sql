-- DropForeignKey
ALTER TABLE "UserTeamFollow" DROP CONSTRAINT "UserTeamFollow_userId_fkey";

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN "esportsResults";

-- DropTable
DROP TABLE "UserTeamFollow";
