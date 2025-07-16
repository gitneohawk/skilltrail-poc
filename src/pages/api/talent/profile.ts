import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { TalentProfile } from '@prisma/client';

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

  // --- GETリクエストの処理 ---
  if (req.method === 'GET') {
    try {
      const talentProfile = await prisma.talentProfile.findUnique({
        where: { userId: userId },
        include: {
          skills: { select: { skill: { select: { id: true, name: true } } } },
          certifications: { select: { certification: { select: { id: true, name: true } } } },
        },
      });
      return res.status(200).json(talentProfile ?? null);
    } catch (error) {
      console.error('Failed to fetch talent profile:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // --- POSTリクエストの処理 ---
  if (req.method === 'POST') {
    const { skills, certifications, ...restOfBody } = req.body;

    const {
      id,
      userId: bodyUserId,
      createdAt,
      updatedAt,
      ...profileData
    } = restOfBody;

    try {
      const updatedProfile = await prisma.$transaction(async (tx) => {
        const profile = await tx.talentProfile.upsert({
          where: { userId: userId },
          update: profileData,
          create: {
            ...profileData,
            userId: userId,
          },
        });
        const profileId = profile.id;

        if (Array.isArray(skills)) {
          await tx.talentSkill.deleteMany({
            where: { talentProfileId: profileId },
          });
          if (skills.length > 0) {
            const skillRecords = await tx.skill.findMany({
              where: {
                name: {
                  in: skills,
                  mode: 'insensitive',
                },
              },
              select: { id: true },
            });
            if (skillRecords.length > 0) {
              await tx.talentSkill.createMany({
                data: skillRecords.map((skill) => ({
                  talentProfileId: profileId,
                  skillId: skill.id,
                })),
              });
            }
          }
        }

        if (Array.isArray(certifications)) {
          await tx.talentCertification.deleteMany({
            where: { talentProfileId: profileId },
          });
          if (certifications.length > 0) {
            const certRecords = await tx.certification.findMany({
              where: {
                name: {
                  in: certifications,
                  mode: 'insensitive',
                },
              },
              select: { id: true },
            });
            if (certRecords.length > 0) {
              await tx.talentCertification.createMany({
                data: certRecords.map((cert) => ({
                  talentProfileId: profileId,
                  certificationId: cert.id,
                })),
              });
            }
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
