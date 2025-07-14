-- CreateTable
CREATE TABLE "AiExtractedSkill" (
    "id" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "level" INTEGER,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI_INTERVIEW',
    "interviewId" TEXT NOT NULL,

    CONSTRAINT "AiExtractedSkill_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AiExtractedSkill" ADD CONSTRAINT "AiExtractedSkill_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "SkillInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
