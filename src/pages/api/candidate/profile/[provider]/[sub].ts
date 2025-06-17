import type { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';
import { CandidateProfile } from '@/types/candidate-profile';
import type { Readable } from 'node:stream';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = 'career-profiles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const provider = req.query.provider as string;
  const rawSub = req.query.sub as string;
  const sub = decodeURIComponent(rawSub);
  if (!provider || typeof provider !== 'string' || !sub || typeof sub !== 'string') {
    res.status(400).json({ error: 'Invalid provider or sub parameter' });
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `${provider}-${sub}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    if (req.method === 'GET') {
      const downloadResponse = await blockBlobClient.download(0);
      const downloaded = await streamToString(downloadResponse.readableStreamBody as unknown as Readable);
      const profile: CandidateProfile = JSON.parse(downloaded);
      res.status(200).json(profile);
    } else if (req.method === 'POST') {
      const profile: CandidateProfile = req.body;
      const content = JSON.stringify(profile, null, 2);
      await blockBlobClient.upload(content, Buffer.byteLength(content));
      res.status(200).json({ message: 'Profile saved successfully.' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.statusCode === 404) {
      res.status(404).json({ error: 'Profile not found for given ID.' });
    } else {
      console.error('Error accessing blob storage:', error);
      res.status(500).json({ error: 'Blob storage operation failed.' });
    }
  }
}

async function streamToString(readableStream: Readable | null): Promise<string> {
  if (!readableStream) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of readableStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}