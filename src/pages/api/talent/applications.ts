import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const talentProfile = await prisma.talentProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!talentProfile) {
    return res.status(403).json({ error: 'Forbidden: User is not a talent.' });
  }

  // --- POST: 新しい応募を作成 ---
  if (req.method === 'POST') {
    const { jobId } = req.body;
    if (typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Job ID is required.' });
    }

    try {
      // ★ 変更点: IDを直接指定するシンプルな方法に戻す
      const newApplication = await prisma.application.create({
        data: {
          jobId: jobId,
          talentId: talentProfile.id,
          status: 'NEW',
        },
      });
      return res.status(201).json(newApplication);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'You have already applied for this job.' });
      }
      console.error('Failed to create application:', error);
      return res.status(500).json({ error: 'Failed to create application.' });
    }
  }

  // --- GET: 自分の応募履歴を取得 ---
  if (req.method === 'GET') {
    try {
      // ★ 変更点: IDを直接指定するシンプルな方法に戻す
      const applications = await prisma.application.findMany({
        where: {
          talentId: talentProfile.id
        },
        include: {
          job: {
            include: {
              company: {
                select: { name: true, logoUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(applications);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch applications.' });
    }
  }

    // --- DELETE: 応募を取り消す ---
  if (req.method === 'DELETE') {
    const { applicationId } = req.body;
    if (typeof applicationId !== 'string') {
      return res.status(400).json({ error: 'Application ID is required.' });
    }

    try {
      // 応募者本人であることも確認
      const result = await prisma.application.deleteMany({
        where: {
          id: applicationId,
          talentId: talentProfile.id,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Application not found or no permission.' });
      }

      return res.status(204).end(); // 成功（コンテンツなし）
    } catch (error) {
      console.error('Failed to delete application:', error);
      return res.status(500).json({ error: 'Failed to delete application.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
