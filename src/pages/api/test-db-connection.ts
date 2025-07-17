// src/pages/api/test-db-connection.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // データベースへの接続を試行し、簡単なクエリを実行
      await prisma.$connect(); // 接続を試みる
      const result = await prisma.$queryRaw`SELECT 1 as test_connection;`; // 実際にクエリを実行
      await prisma.$disconnect(); // 接続を切断 (任意)

      if (result && (result as any[]).length > 0) {
        return res.status(200).json({ status: 'success', message: 'Database connection successful!' });
      } else {
        return res.status(500).json({ status: 'error', message: 'Database connection failed, but query returned no data.' });
      }
    } catch (error: any) {
      console.error("DB Connection Test Error:", error); // Application Insights にログが出力されるはず
      return res.status(500).json({ status: 'error', message: 'Database connection failed.', details: error.message || error.toString() });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
