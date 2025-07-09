/*
  Warnings:

  - You are about to drop the column `headquarters` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `headquartersCity` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `headquartersCountry` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `headquartersRegion` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "headquarters",
DROP COLUMN "headquartersCity",
DROP COLUMN "headquartersCountry",
DROP COLUMN "headquartersRegion";
