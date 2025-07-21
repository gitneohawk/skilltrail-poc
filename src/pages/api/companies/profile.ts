// pages/api/companies/profile.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ★★★ ここに修正を追加 ★★★
// JSON.stringifyがBigIntを扱えるようにするための拡張（おまじない）
// これにより、APIがレスポンスを返す際にBigIntでエラーになるのを防ぎます。
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
// ★★★ ここまで ★★★

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // --- GETリクエストの処理 (既存プロフィールの取得) ---
  if (req.method === 'GET') {
    try {
      const userWithCompany = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: {
            // 会社の情報と一緒に、関連する担当者情報も取得
            include: {
              contact: true,
            }
          }
        },
      });

      if (userWithCompany?.company) {
        return res.status(200).json(userWithCompany.company);
      } else {
        // プロフィールがまだない場合はnullを返す
        return res.status(200).json(null);
      }
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // --- POST/PUTリクエストの処理 (新規作成・編集) ---
  if (req.method === 'POST' || req.method === 'PUT') {
    const { contact, ...profileData } = req.body;

    if (!profileData.corporateNumber || !contact?.email) {
      return res.status(400).json({ error: 'Corporate number and contact email are required.' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {

        // 会社のデータ（存在すれば更新、なければ作成）
        const companyUpsertData = {
            corporateNumber: profileData.corporateNumber,
          name: profileData.name,
          description: profileData.description,
          industry: profileData.industry,
          yearFounded: profileData.yearFounded ? Number(profileData.yearFounded) : null,
          companySize: profileData.companySize,
          website: profileData.website,
          logoUrl: profileData.logoUrl,
          headerImageUrl: profileData.headerImageUrl,
          headerImageOffsetY: profileData.headerImageOffsetY,
          headquarters: profileData.headquarters,
          capitalStock: profileData.capitalStock ? BigInt(profileData.capitalStock) : null,
          mission: profileData.mission,
          cultureAndValues: profileData.cultureAndValues,
          techStack: profileData.techStack,
          employeeBenefits: profileData.employeeBenefits,
          securityTeamSize: profileData.securityTeamSize,
          hasCiso: profileData.hasCiso,
          hasCsirt: profileData.hasCsirt,
          isCsirtMember: profileData.isCsirtMember,
          securityCertifications: profileData.securityCertifications,
          certificationSupport: profileData.certificationSupport,
        };

        const upsertedCompany = await tx.company.upsert({
          where: { corporateNumber: profileData.corporateNumber },
          create: companyUpsertData,
          update: companyUpsertData,
        });

        // 担当者データ（存在すれば更新、なければ作成）
        await tx.contact.upsert({
            where: { companyId: upsertedCompany.corporateNumber },
              create: {
                companyId: upsertedCompany.corporateNumber,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              },
              update: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              }
        })

        // ユーザーを会社に紐付ける
        await tx.user.update({
          where: { id: userId },
          data: { companyId: upsertedCompany.corporateNumber },
      });

        return upsertedCompany;
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error creating or updating company profile:', error);
      if (error.code === 'P2002') {
         return res.status(409).json({ error: 'This company profile already exists.' });
      }
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  // PUTも許可
  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
