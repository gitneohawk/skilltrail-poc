/*
  Warnings:

  - You are about to drop the column `locations` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `registeredDate` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "locations",
DROP COLUMN "registeredDate",
ADD COLUMN     "certificationSupport" BOOLEAN,
ADD COLUMN     "companyType" TEXT,
ADD COLUMN     "conferenceParticipation" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cultureAndValues" TEXT,
ADD COLUMN     "employeeBenefits" TEXT[],
ADD COLUMN     "gallery" JSONB,
ADD COLUMN     "hasCiso" BOOLEAN,
ADD COLUMN     "hasCsirt" BOOLEAN,
ADD COLUMN     "isCsirtMember" BOOLEAN,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "securityAreas" TEXT[],
ADD COLUMN     "securityCertifications" TEXT[],
ADD COLUMN     "securityTeamSize" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "techStack" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "yearFounded" INTEGER,
ALTER COLUMN "industry" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;
