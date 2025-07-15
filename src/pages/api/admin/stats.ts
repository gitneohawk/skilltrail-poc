import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Access is denied.' });
  }

  if (req.method === 'GET') {
    try {
      // 複数のDB問い合わせを１つのトランザクションで効率的に実行
      const [talentCount, companyCount, jobCount] = await prisma.$transaction([
        prisma.talentProfile.count(),
        prisma.company.count(),
        prisma.job.count({ where: { status: 'PUBLISHED' } }),
      ]);

      return res.status(200).json({
        talentCount,
        companyCount,
        jobCount,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
