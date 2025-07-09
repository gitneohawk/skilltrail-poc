/*
  Warnings:

  - The primary key for the `Company` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[corporateNumber]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `corporateNumber` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- Step 1: Add the corporateNumber column
ALTER TABLE "Company" ADD COLUMN "corporateNumber" TEXT;

-- Step 2: Update existing rows with default corporateNumber
UPDATE "Company" SET "corporateNumber" = 'DEFAULT_CORPORATE_NUMBER' WHERE "corporateNumber" IS NULL;

-- AlterTable
ALTER TABLE "Company" DROP CONSTRAINT "Company_pkey",
DROP COLUMN "id",
ALTER COLUMN "corporateNumber" SET NOT NULL,
ADD CONSTRAINT "Company_pkey" PRIMARY KEY ("corporateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_corporateNumber_key" ON "Company"("corporateNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("corporateNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Update User table to match corporateNumber
UPDATE "User" SET "companyId" = 'DEFAULT_CORPORATE_NUMBER' WHERE "companyId" IS NOT NULL;
