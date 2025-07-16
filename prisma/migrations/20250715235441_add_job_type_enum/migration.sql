/*
  Warnings:

  - The `employmentType` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'INTERNSHIP', 'CONTRACT');

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "employmentType",
ADD COLUMN     "employmentType" "JobType";
