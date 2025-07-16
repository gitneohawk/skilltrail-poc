import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { JobType } from '@prisma/client'; // ★ JobTypeをインポート


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
        const { jobType } = req.query; // ★ jobTypeクエリを受け取る

    // 1. 公開中の全求人を取得
    const allPublishedJobs = await prisma.job.findMany({
      where: {
        status: 'PUBLISHED',
        // ★ jobTypeによる絞り込み条件を追加
        employmentType: jobType ? (jobType as JobType) : undefined,
      },
      include: {
        company: { // 会社情報も一緒に取得
          select: {
            name: true,
            logoUrl: true,
          }
        }
      }
    });

    // 2. スキルごとの求人件数を集計
    const skillCounts: { [key: string]: number } = {};
    allPublishedJobs.forEach(job => {
      job.requiredSkills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    // 3. APIの応答として、求人リストとスキルごとの件数を返す
    res.status(200).json({
      jobs: allPublishedJobs,
      skillCounts,
    });

  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
