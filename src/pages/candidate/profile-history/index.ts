import type { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';

type ProfileData = {
  ageRange: string;
  location: string;
  experiences: {
    company: string;
    position: string;
    start: string;
    end: string;
  }[];
};

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    res.status(500).json({ error: 'Storage connection string is not configured.' });
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerName = 'profiles';
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  if (req.method === 'POST') {
    try {
      const body: ProfileData = req.body;
      const timestamp = new Date().toISOString();
      const blobName = `user-profile-${timestamp}.json`;

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const dataString = JSON.stringify(body);
      await blockBlobClient.upload(dataString, Buffer.byteLength(dataString));

      console.log('受信データ:', body);
      res.status(200).json({ message: 'Profile saved to Blob Storage!' });
    } catch (err) {
      console.error('Error saving to Blob Storage', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    const blob = req.query.blob as string | undefined;

    if (blob) {
      // Fetch specific blob content
      try {
        const blockBlobClient = containerClient.getBlockBlobClient(blob);
        const downloadBlockBlobResponse = await blockBlobClient.download();
        const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
        const jsonData = JSON.parse(downloaded.toString());
        res.status(200).json(jsonData);
      } catch (err) {
        console.error('Error reading blob:', err);
        res.status(500).json({ error: 'Failed to read blob' });
      }
    } else {
      // List blobs
      try {
        const blobs = [];
        for await (const b of containerClient.listBlobsFlat()) {
          blobs.push(b.name);
        }
        res.status(200).json({ blobs });
      } catch (err) {
        console.error('Error listing blobs', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function streamToBuffer(readableStream?: NodeJS.ReadableStream): Promise<Buffer> {
  if (!readableStream) return Buffer.from([]);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}