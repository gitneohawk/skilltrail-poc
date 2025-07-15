// /pages/api/talent/ai-extracted-skills.ts (GET/POST両対応の最終版)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { AiExtractedSkill } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // --- GET: スキル一覧の取得 ---
  if (req.method === 'GET') {
    try {
      const latestInterview = await prisma.skillInterview.findFirst({
        where: { talentProfile: { userId }, extractionStatus: 'COMPLETED' },
        orderBy: { updatedAt: 'desc' },
        include: { aiExtractedSkills: { orderBy: { category: 'asc' } } },
      });
      if (!latestInterview) {
        return res.status(200).json([]);
      }
      return res.status(200).json(latestInterview.aiExtractedSkills);
    } catch (error) {
      console.error('Failed to fetch AI extracted skills:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // --- POST: スキル一覧の更新 ---
  if (req.method === 'POST') {
    const { skills, interviewId } = req.body as { skills: Omit<AiExtractedSkill, 'id' | 'source' | 'interviewId'>[], interviewId: string };

    if (!Array.isArray(skills) || !interviewId) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.aiExtractedSkill.deleteMany({
          where: { interviewId: interviewId },
        });
        if (skills.length > 0) {
          const skillsToSave = skills.map(skill => ({
            ...skill,
            interviewId: interviewId,
          }));
          await tx.aiExtractedSkill.createMany({
            data: skillsToSave,
          });
        }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update AI extracted skills:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GETでもPOSTでもない場合
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
