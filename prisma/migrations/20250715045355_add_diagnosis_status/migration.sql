-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "AnalysisResult" ADD COLUMN     "diagnosisStatus" "DiagnosisStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "summary" DROP NOT NULL,
ALTER COLUMN "strengths" DROP NOT NULL,
ALTER COLUMN "advice" DROP NOT NULL,
ALTER COLUMN "skillGapAnalysis" DROP NOT NULL,
ALTER COLUMN "experienceMethods" DROP NOT NULL;
