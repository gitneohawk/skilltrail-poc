import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return res.status(401).json({ error: 'Unauthorized or not a company user.' });
  }
  const { companyId } = session.user;

  // --- GET: 自社の求人一覧を取得 ---
  if (req.method === 'GET') {
    try {
      const jobs = await prisma.job.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(jobs);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch jobs.' });
    }
  }

  // --- POST: 新しい求人を作成 ---
  if (req.method === 'POST') {
    const data = req.body;
    try {
      const newJob = await prisma.job.create({
        data: {
          companyId, // ログインしている企業に紐付ける
          title: data.title,
          description: data.description,
          status: data.status || 'DRAFT',
          employmentType: data.employmentType,
          location: data.location,
          salaryMin: data.salaryMin ? parseInt(data.salaryMin, 10) : null,
          salaryMax: data.salaryMax ? parseInt(data.salaryMax, 10) : null,
          requiredSkills: data.requiredSkills || [],
          preferredSkills: data.preferredSkills || [],
        },
      });
      return res.status(201).json(newJob);
    } catch (error) {
      console.error('Failed to create job:', error);
      return res.status(500).json({ error: 'Failed to create job.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
