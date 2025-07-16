import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Prisma } from '@prisma/client'; // Prismaの型を直接使用

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.companyId) {
    return res.status(401).json({ error: 'Unauthorized: Company user required.' });
  }

  try {
    const { skills, internship } = req.query;
    const skillList = typeof skills === 'string' && skills ? skills.split(',') : [];

    // 検索条件を構築
    const whereClause: Prisma.TalentProfileWhereInput = {
      isPublic: true,
      // 指定されたスキルをすべて持つユーザーを検索
      AND: skillList.map(skillName => ({
        skills: {
          some: {
            skill: {
              name: {
                equals: skillName,
                mode: 'insensitive', // ★ 大文字・小文字を区別しないモードを追加
              },
            },
          },
        },
      })),
    };

    // internshipフラグがtrueなら、条件を追加
    if (internship === 'true') {
      whereClause.talentType = 'STUDENT';
      whereClause.wantsInternship = true;
    }

    const talents = await prisma.talentProfile.findMany({
      where: whereClause,
      // ★プライバシーへの配慮：返す情報を限定する
      select: {
        id: true, // 詳細ページへのリンク用にIDは必要
        desiredJobTitles: true,
        workPreference: true,
        careerSummary: true,
        // スキルと資格は表示する
        skills: {
          select: {
            skill: {
              select: { name: true },
            },
          },
        },
        certifications: {
          select: {
            certification: {
              select: { name: true },
            },
          },
        },
        // ユーザーの個人情報は含めない
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.status(200).json(talents);

  } catch (error) {
    console.error('Failed to search talent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
