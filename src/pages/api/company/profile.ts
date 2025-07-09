// pages/api/company/profile.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

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
        return res.status(404).json({ error: 'Company profile not found.' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // --- POSTリクエストの処理 (新規作成) ---
  if (req.method === 'POST') {
    const { contact, ...profileData } = req.body;

    if (!profileData.corporateNumber || !contact?.email) {
      return res.status(400).json({ error: 'Corporate number and contact email are required.' });
    }

    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newCompany = await tx.company.create({
          data: {
            corporateNumber: profileData.corporateNumber,
            name: profileData.name,
            description: profileData.description,
            industry: profileData.industry,
            yearFounded: profileData.yearFounded,
            companySize: profileData.companySize,
            website: profileData.website,
            logoUrl: profileData.logoUrl,
            headerImageUrl: profileData.headerImageUrl,
            headquarters: profileData.headquarters,
            capitalStock: profileData.capitalStock ? Number(profileData.capitalStock) : null,
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
            contact: {
              create: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              }
            }
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { companyId: newCompany.corporateNumber },
        });

        return { newCompany };
      });

      return res.status(201).json(result.newCompany);
    } catch (error: any) {
      console.error('Error creating company profile:', error);
      if (error.code === 'P2002') {
         return res.status(409).json({ error: 'This company profile already exists.' });
      }
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  // --- PUTリクエストの処理 (更新) ---
  if (req.method === 'PUT') {
    const { contact, ...profileData } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const companyId = user?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: 'User is not associated with any company.' });
      }

      const updatedCompany = await prisma.company.update({
        where: { corporateNumber: companyId },
        data: {
          name: profileData.name,
          description: profileData.description,
          industry: profileData.industry,
          yearFounded: profileData.yearFounded,
          companySize: profileData.companySize,
          website: profileData.website,
          logoUrl: profileData.logoUrl,
          headerImageUrl: profileData.headerImageUrl,
          headquarters: profileData.headquarters,
          capitalStock: profileData.capitalStock ? Number(profileData.capitalStock) : null,
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
          contact: {
            upsert: {
              create: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              },
              update: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              }
            }
          }
        },
      });
      return res.status(200).json(updatedCompany);
    } catch (error) {
      console.error('Error updating company profile:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
