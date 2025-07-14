// /pages/api/talent/diagnosis/latest.ts

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

  try {
    // ログインユーザーの最新の診断結果を取得
    const latestAnalysis = await prisma.analysisResult.findFirst({
      where: {
        talentProfile: {
          userId: session.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        // 診断結果に紐づく学習ロードマップのステップも一緒に取得
        roadmapSteps: {
          orderBy: {
            stepNumber: 'asc',
          },
        },
      },
    });

    // 結果が存在しない場合はnullを返す
    return res.status(200).json(latestAnalysis);

  } catch (error) {
    console.error('Failed to fetch latest analysis:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
