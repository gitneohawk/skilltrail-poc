-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SkillInterview" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "talentProfileId" TEXT NOT NULL,

    CONSTRAINT "SkillInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillInterviewMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,

    CONSTRAINT "SkillInterviewMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SkillInterview" ADD CONSTRAINT "SkillInterview_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillInterviewMessage" ADD CONSTRAINT "SkillInterviewMessage_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "SkillInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
