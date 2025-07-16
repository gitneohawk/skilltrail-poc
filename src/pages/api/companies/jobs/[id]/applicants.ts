import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.companyId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { id: jobId } = req.query;
  if (typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required.' });
  }

  if (req.method === 'GET') {
    try {
      const applications = await prisma.application.findMany({
        where: {
          jobId: jobId,
          job: {
            companyId: session.user.companyId, // 自社の求人であるか確認
          },
        },
        include: {
          talent: { // 応募者のプロフィールも取得
            select: { // ただし個人情報は含めない
              id: true,
              desiredJobTitles: true,
              skills: { include: { skill: true } },
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(applications);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch applicants.' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
