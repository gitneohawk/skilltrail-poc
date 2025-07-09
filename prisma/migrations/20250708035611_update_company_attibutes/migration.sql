/*
  Warnings:

  - You are about to drop the column `companyType` on the `Company` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Company_corporateNumber_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "companyType",
ADD COLUMN     "capitalStock" INTEGER,
ADD COLUMN     "corporateType" TEXT,
ADD COLUMN     "headquarters" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
