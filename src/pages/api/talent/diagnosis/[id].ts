// /pages/api/talent/diagnosis/[id].ts

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

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const analysisResult = await prisma.analysisResult.findFirst({
      where: {
        // 指定されたIDであること
        id: id,
        // かつ、ログインしているユーザーのものであること（重要：他人に見られるのを防ぐ）
        talentProfile: {
          userId: session.user.id,
        },
      },
      include: {
        roadmapSteps: {
          orderBy: {
            stepNumber: 'asc',
          },
        },
      },
    });

    if (!analysisResult) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error(`Failed to fetch analysis for id ${id}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
