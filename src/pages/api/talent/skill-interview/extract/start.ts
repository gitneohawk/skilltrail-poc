// /api/talent/skill-interview/extract/start.ts (修正後)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { interviewId } = req.body;
  if (typeof interviewId !== 'string') {
    return res.status(400).json({ error: 'interviewId is required' });
  }

  try {
    // ステータスを「PROCESSING」に更新するだけ
    await prisma.skillInterview.update({
      where: { id: interviewId },
      data: { extractionStatus: 'PROCESSING' },
    });

    // すぐに応答を返す
    res.status(202).json({ message: 'Extraction process started.' });

  } catch (error) {
    console.error('Failed to start extraction process:', error);
    res.status(500).json({ error: 'Failed to start extraction' });
  }
}
