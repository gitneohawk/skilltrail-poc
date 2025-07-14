// pages/api/talent/skills.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // 自分のTalentProfileを取得
  const talentProfile = await prisma.talentProfile.findUnique({
    where: { userId },
    select: { id: true }, // プロフィールIDだけ取得すればOK
  });

  if (!talentProfile) {
    return res.status(404).json({ error: 'Talent profile not found.' });
  }
  const talentProfileId = talentProfile.id;

  // --- GETリクエストの処理 (現在のスキル一覧を取得) ---
  if (req.method === 'GET') {
    try {
      const savedSkills = await prisma.talentSkill.findMany({
        where: { talentProfileId },
        include: { skill: true },
      });
      const skillNames = savedSkills.map(s => s.skill.name);
      return res.status(200).json(skillNames);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch skills.' });
    }
  }

  // --- POSTリクエストの処理 (スキル一覧を更新) ---
  if (req.method === 'POST') {
    const { skills } = req.body; // 例: ["NIST CSF", "Python"]

    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Invalid skills format.' });
    }

    try {
      // Prismaのネストした書き込み機能を使って、関連スキルを一度に更新する
      await prisma.talentProfile.update({
        where: { id: talentProfileId },
        data: {
          skills: {
            // 1. まず、このTalentに紐づく既存のスキルを全て削除する
            deleteMany: {},
            // 2. 次に、フロントエンドから受け取った新しいスキルリストを作成・紐付けする
            create: skills.map((skillName: string) => ({
              // skillテーブルへの操作を定義
              skill: {
                // `connectOrCreate`を使い、スキルマスタに...
                connectOrCreate: {
                  // ...`name`が`skillName`のスキルがあれば、それに接続(connect)し、
                  where: { name: skillName },
                  // ...なければ、`skillName`で新しく作成(create)する
                  create: { name: skillName },
                },
              },
            })),
          },
        },
      });

      return res.status(200).json({ message: 'Skills updated successfully.' });
    } catch (error) {
      console.error('Failed to update skills:', error);
      return res.status(500).json({ error: 'Failed to update skills.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
