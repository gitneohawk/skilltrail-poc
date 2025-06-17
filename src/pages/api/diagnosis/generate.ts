

import type { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';
import { CandidateProfile } from '@/types/candidate-profile';
import { DiagnosisResult } from '@/types/diagnosis-result';
import { buildPrompt } from '@/lib/diagnosis-prompt';
import { callOpenAI } from '@/lib/openai-client';
import type { Readable } from 'node:stream';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = 'career-profiles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { provider, sub } = req.body;
    if (!provider || !sub) {
      res.status(400).json({ error: 'Missing provider or sub' });
      return;
    }

    const safeSub = encodeURIComponent(sub);
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${provider}-${safeSub}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download(0);
    const downloaded = await streamToString(downloadResponse.readableStreamBody as unknown as Readable);
    const profile: CandidateProfile = JSON.parse(downloaded);

    const prompt = buildPrompt(profile);
    const diagnosis: DiagnosisResult = await callOpenAI(prompt);

    res.status(200).json(diagnosis);
  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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