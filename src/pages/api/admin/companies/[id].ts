import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Access is denied.' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Corporate number is required.' });
  }

  // --- GET: 特定の企業情報を取得 ---
  if (req.method === 'GET') {
    const company = await prisma.company.findUnique({ where: { corporateNumber: id } });
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    return res.status(200).json(company);
  }

  // --- PUT: 特定の企業情報を更新 ---
  if (req.method === 'PUT') {
    const { sponsorshipTier } = req.body;
    try {
      const updatedCompany = await prisma.company.update({
        where: { corporateNumber: id },
        data: { sponsorshipTier },
      });
      return res.status(200).json(updatedCompany);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update company.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
