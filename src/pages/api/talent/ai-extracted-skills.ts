// /pages/api/talent/ai-extracted-skills.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  try {
    // ユーザーの最新のインタビューに紐づくAI抽出スキルを取得
    const latestInterview = await prisma.skillInterview.findFirst({
      where: {
        talentProfile: { userId },
        // 抽出が完了した最新のインタビューを対象
        extractionStatus: 'COMPLETED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        aiExtractedSkills: {
          orderBy: {
            category: 'asc',
          },
        },
      },
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
