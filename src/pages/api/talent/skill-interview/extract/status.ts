// /api/talent/skill-interview/extract/status.ts (新規作成)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { interviewId } = req.query;
  if (typeof interviewId !== 'string') return res.status(400).json({ error: 'interviewId is required' });

  const interview = await prisma.skillInterview.findUnique({
    where: { id: interviewId },
    select: { extractionStatus: true, extractionError: true },
  });

  if (!interview) return res.status(404).json({ error: 'Interview not found' });

  res.status(200).json(interview);
}
