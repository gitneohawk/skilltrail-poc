// pages/api/talent/profile.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { TalentProfile } from '@prisma/client';

// フロントエンドに返すプロフィールの型定義
// 関連データを含めるため拡張
export type TalentProfileWithRelations = TalentProfile & {
  skills: { skill: { id: number; name: string } }[];
  certifications: { certification: { id: number; name: string } }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // --- GETリクエストの処理 (自分のプロフィールと関連データを取得) ---
  if (req.method === 'GET') {
    try {
      const talentProfile = await prisma.talentProfile.findUnique({
        where: { userId: userId },
        // ★ 変更点: 関連するスキルと資格を一緒に取得する
        include: {
          skills: {
            select: {
              skill: { select: { id: true, name: true } },
            },
          },
          certifications: {
            select: {
              certification: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (talentProfile) {
        return res.status(200).json(talentProfile);
      } else {
        // プロフィールがまだない場合はnullを返す（フロントでハンドリングしやすくするため）
        return res.status(200).json(null);
      }
    } catch (error) {
      console.error('Failed to fetch talent profile:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // --- POSTリクエストの処理 (プロフィールの新規作成または更新) ---
  if (req.method === 'POST') {
    // ★ 変更点: スキルと資格の配列を受け取る
    const { skills, certifications, ...profileData } = req.body;

    try {
      // ★ 変更点: 全てのDB操作をトランザクション内で実行
      const updatedProfile = await prisma.$transaction(async (tx) => {
        // Step 1: プロフィール本体の作成または更新
        const profile = await tx.talentProfile.upsert({
          where: { userId: userId },
          update: profileData,
          create: {
            ...profileData,
            userId: userId,
          },
        });
        const profileId = profile.id;

        // Step 2: スキルの更新（Sync方式）
        if (Array.isArray(skills)) {
          // 既存のスキル関連を全て削除
          await tx.talentSkill.deleteMany({
            where: { talentProfileId: profileId },
          });

          // フロントから来たスキル名に対応するIDをDBから取得
          const skillRecords = await tx.skill.findMany({
            where: { name: { in: skills } },
            select: { id: true },
          });

          // 新しいスキル関連を作成
          if (skillRecords.length > 0) {
            await tx.talentSkill.createMany({
              data: skillRecords.map((skill) => ({
                talentProfileId: profileId,
                skillId: skill.id,
              })),
            });
          }
        }

        // Step 3: 資格の更新（Sync方式）
        if (Array.isArray(certifications)) {
          // 既存の資格関連を全て削除
          await tx.talentCertification.deleteMany({
            where: { talentProfileId: profileId },
          });

          // フロントから来た資格名に対応するIDをDBから取得
          const certRecords = await tx.certification.findMany({
            where: { name: { in: certifications } },
            select: { id: true },
          });

          // 新しい資格関連を作成
          if (certRecords.length > 0) {
            await tx.talentCertification.createMany({
              data: certRecords.map((cert) => ({
                talentProfileId: profileId,
                certificationId: cert.id,
              })),
            });
          }
        }

        return profile;
      });

      return res.status(200).json(updatedProfile);

    } catch (error) {
      console.error('Failed to create or update talent profile:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
