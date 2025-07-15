import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  // ADMINロールを持つユーザーでなければアクセスを拒否
  if (session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Access is denied.' });
  }

  if (req.method === 'GET') {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(companies);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch companies.' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
