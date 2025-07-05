import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { BlobServiceClient } from '@azure/storage-blob';
import { streamToString } from '@/utils/stream'; // 既存のヘルパー関数を再利用

const learningPlanDetailsContainerName = 'learning-plan-details';

// このAPIは、特定の学習ステップの詳細なMarkdownコンテンツを取得します。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { stage } = req.query;
  if (typeof stage !== 'string') {
    return res.status(400).json({ error: 'Stage number is required.' });
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
    const containerClient = blobServiceClient.getContainerClient(learningPlanDetailsContainerName);

    // Blob名を構築: {userId}/{stage}.md
    const blobName = `${session.user.sub}/${stage}.md`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // BlobからMarkdownテキストをダウンロード
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const markdownContent = await streamToString(downloadBlockBlobResponse.readableStreamBody!);

    // テキストとしてレスポンスを返す
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.status(200).send(markdownContent);

  } catch (error: any) {
    if (error.statusCode === 404) {
      // ファイルがまだ生成されていない場合は、準備中であることを示すメッセージを返す
      res.status(202).send('詳細コンテンツは現在準備中です。少し時間をおいてから、再度お試しください。');
    } else {
      console.error(`Error fetching detail for stage ${stage}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
