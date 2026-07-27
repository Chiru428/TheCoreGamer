/*
  Warnings:

  - You are about to drop the column `franchiseId` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the `Franchise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FranchiseGame` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FranchiseGame" DROP CONSTRAINT "FranchiseGame_franchiseId_fkey";

-- DropForeignKey
ALTER TABLE "FranchiseGame" DROP CONSTRAINT "FranchiseGame_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_franchiseId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "franchiseId";

-- DropTable
DROP TABLE "Franchise";

-- DropTable
DROP TABLE "FranchiseGame";
