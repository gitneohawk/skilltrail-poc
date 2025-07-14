// pages/api/companies/list.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 全ての会社情報を取得
    // 将来的には、ここでスポンサー企業のみをフィルタリングすることも可能
    const companies = await prisma.company.findMany({
      select: {
        corporateNumber: true,
        name: true,
        logoUrl: true,
        tagline: true,
        industry: true,
      },
      // 例えば、新しい順に表示
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json(companies);

  } catch (error) {
    console.error('Failed to fetch company list:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
