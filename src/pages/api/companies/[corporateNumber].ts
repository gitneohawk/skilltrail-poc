// pages/api/companies/[corporateNumber].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GETリクエスト以外は許可しない
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // URLから法人番号を取得 (例: /api/companies/12345 -> corporateNumber = "12345")
  const { corporateNumber } = req.query;

  if (typeof corporateNumber !== 'string') {
    return res.status(400).json({ error: 'Invalid corporate number.' });
  }

  try {
    // 法人番号をキーにして、Companyテーブルからデータを検索
    const companyProfile = await prisma.company.findUnique({
      where: {
        corporateNumber: corporateNumber,
      },
    });

    // データが見つかった場合
    if (companyProfile) {
      // BigInt型を文字列に変換してからレスポンスを返す
      const profileForJson = {
        ...companyProfile,
        capitalStock: companyProfile.capitalStock?.toString(),
      };
      return res.status(200).json(profileForJson);
    } else {
      // データが見つからなかった場合
      return res.status(404).json({ error: 'Company not found.' });
    }
  } catch (error) {
    console.error('Failed to fetch company profile:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
