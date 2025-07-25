// pages/api/talent/diagnosis/start.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
// ★★★ 修正点: execute.tsから診断実行ロジックをインポート ★★★
import { runDiagnosis } from './execute';

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

    // ★★★ 修正点: fetchの代わりに、インポートした関数を直接呼び出す ★★★
    // awaitを付けないことで、レスポンスをブロックせずにバックグラウンドで実行する
    runDiagnosis(newAnalysis.id);

  } catch (error) {
    console.error('Failed to start diagnosis process:', error);
    res.status(500).json({ error: 'Failed to start diagnosis process' });
  }
}
