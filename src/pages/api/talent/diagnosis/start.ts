import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const profile = await prisma.talentProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // まずは「処理中」の空のレコードを作成する
    const newAnalysis = await prisma.analysisResult.create({
      data: {
        talentProfileId: profile.id,
        diagnosisStatus: 'PROCESSING', // ステータスを「処理中」で作成
      },
    });

    // すぐに新しい診断のIDを返す
    res.status(202).json({ analysisId: newAnalysis.id });

    // fire-and-forgetで重い処理を実行するAPIを呼び出す
    fetch(`${process.env.NEXTAUTH_URL}/api/talent/diagnosis/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId: newAnalysis.id }),
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to start diagnosis process' });
  }
}
