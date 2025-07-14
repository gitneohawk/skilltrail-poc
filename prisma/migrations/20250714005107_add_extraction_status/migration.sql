-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "SkillInterview" ADD COLUMN     "extractionError" TEXT,
ADD COLUMN     "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'NOT_STARTED';
