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
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const { companyId } = session.user;
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required.' });
  }

  // --- GET: 特定の求人情報を取得 ---
  if (req.method === 'GET') {
    const job = await prisma.job.findFirst({
      where: { id, companyId }, // 自社の求人であることも確認
    });
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    return res.status(200).json(job);
  }

  // --- PUT: 特定の求人情報を更新 ---
  if (req.method === 'PUT') {
    const data = req.body;
    const job = await prisma.job.updateMany({
      where: { id, companyId }, // 自社の求人のみ更新可能
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        employmentType: data.employmentType,
        location: data.location,
        salaryMin: data.salaryMin ? parseInt(data.salaryMin, 10) : null,
        salaryMax: data.salaryMax ? parseInt(data.salaryMax, 10) : null,
        requiredSkills: data.requiredSkills,
      },
    });
    if (job.count === 0) return res.status(404).json({ error: 'Job not found or no permission.' });
    return res.status(200).json({ success: true });
  }

  // --- DELETE: 特定の求人情報を削除 ---
  if (req.method === 'DELETE') {
    const job = await prisma.job.deleteMany({
      where: { id, companyId }, // 自社の求人のみ削除可能
    });
    if (job.count === 0) return res.status(404).json({ error: 'Job not found or no permission.' });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
