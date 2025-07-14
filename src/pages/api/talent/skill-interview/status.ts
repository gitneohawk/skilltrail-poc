// /pages/api/talent/skill-interview/status.ts

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
    const interviewInProgress = await prisma.skillInterview.findFirst({
      where: {
        talentProfile: { userId },
        status: 'IN_PROGRESS',
      },
    });

    res.status(200).json({ hasInterviewInProgress: !!interviewInProgress });

  } catch (error) {
    console.error('Failed to get interview status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
}
