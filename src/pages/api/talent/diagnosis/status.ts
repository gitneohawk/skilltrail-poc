import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

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

  const { analysisId } = req.query;
  if (typeof analysisId !== 'string') {
    return res.status(400).json({ error: 'analysisId is required' });
  }

  try {
    const result = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      select: { diagnosisStatus: true },
    });

    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
