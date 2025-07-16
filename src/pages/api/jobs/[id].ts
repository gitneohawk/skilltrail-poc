import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID must be a string.' });
  }

  try {
    const job = await prisma.job.findFirst({
      where: {
        id: id,
        status: 'PUBLISHED', // 公開中の求人のみ
      },
      include: {
        company: {
          select: {
            name: true,
            logoUrl: true,
            description: true,
            website: true,
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or not published.' });
    }

    return res.status(200).json(job);

  } catch (error) {
    console.error('Failed to fetch job details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
