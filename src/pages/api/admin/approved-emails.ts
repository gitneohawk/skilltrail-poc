import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // --- GET: 許可済みメールアドレス一覧を取得 ---
  if (req.method === 'GET') {
    const emails = await prisma.approvedEmail.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json(emails);
  }

  // --- POST: 新しいメールアドレスを追加 ---
  if (req.method === 'POST') {
    const { email } = req.body;
    if (typeof email !== 'string' || !email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    try {
      const newEmail = await prisma.approvedEmail.create({ data: { email } });
      return res.status(201).json(newEmail);
    } catch (error) {
      return res.status(409).json({ error: 'Email already exists.' }); // 既に存在する場合
    }
  }

  // --- DELETE: メールアドレスを削除 ---
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'ID is required.' });
    }
    try {
      await prisma.approvedEmail.delete({ where: { id } });
      return res.status(204).end();
    } catch (error) {
      return res.status(404).json({ error: 'Email not found.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
