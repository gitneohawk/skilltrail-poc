import { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const provider = 'azure'; // getDefaultProviderを削除し、固定値に変更
  const sub = session.user.sub || 'unknown';

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage Connection String is not configured on the server.');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient('career-profiles');

  switch (req.method) {
    case 'GET':
      try {
        const blobName = `${provider}-${sub}.json`; // 修正: provider/sub.json -> provider-sub.json
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        const profileData = JSON.parse(await streamToString(downloadBlockBlobResponse.readableStreamBody));
        return res.status(200).json(profileData);
      } catch (error: any) {
        if (error.statusCode === 404) {
          return res.status(404).json({ message: 'Profile not found' });
        }
        console.error('API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

    case 'POST':
      try {
        const blobName = `${provider}-${sub}.json`; // 修正: provider/sub.json -> provider-sub.json
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(JSON.stringify(req.body), JSON.stringify(req.body).length);
        return res.status(200).json({ message: 'Profile updated successfully' });
      } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function streamToString(readableStream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!readableStream) return '';
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}
