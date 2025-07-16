/*
  Warnings:

  - You are about to drop the column `companyName` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Application` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jobId,talentId]` on the table `Application` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jobId` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `talentId` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "companyName",
DROP COLUMN "email",
ADD COLUMN     "jobId" TEXT NOT NULL,
ADD COLUMN     "talentId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_talentId_key" ON "Application"("jobId", "talentId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
