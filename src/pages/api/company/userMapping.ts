import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { appendToJsonArrayBlob, getJsonFromBlob } from '@/utils/azureBlob';
import type { CompanyUserMapping } from '@/types/CompanyUserMapping';
import { BlobServiceClient } from '@azure/storage-blob';

const containerName = 'company-user-mappings';

const ensureContainerExists = async (containerName: string) => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const exists = await containerClient.exists();
  if (!exists) {
    await containerClient.create();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureContainerExists(containerName); // コンテナが存在しない場合は作成

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.sub;

  if (req.method === 'POST') {
    const { companyId, role }: { companyId: string; role: 'admin' | 'editor' | 'viewer' } = req.body;

    if (!companyId || !role) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const mapping: CompanyUserMapping = {
      companyId,
      userId,
      role,
      assignedDate: new Date().toISOString(),
    };

    try {
      await appendToJsonArrayBlob(containerName, `${companyId}.json`, mapping);
      res.status(200).json({ message: '担当者が企業に紐付けられました' });
    } catch (error: any) {
      console.error('Error saving user mapping:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'GET') {
    try {
      const mappings = (await getJsonFromBlob(containerName, 'cmpy', userId)) as CompanyUserMapping[];
      if (!mappings || mappings.length === 0) {
        return res.status(404).json({ error: 'No mappings found for the user' });
      }
      res.status(200).json(mappings);
    } catch (error: any) {
      console.error('Error retrieving user mappings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
