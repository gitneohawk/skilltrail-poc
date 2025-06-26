import { getServerSession } from 'next-auth';
import authOptions from '@/pages/api/auth/[...nextauth]';
import { getUserIdFromSession } from '@/utils/stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadJsonToBlob, downloadJsonFromBlob, listProfileBlobNames } from '@/utils/azureBlob';
import type { Session } from 'next-auth';

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

const CONTAINER_NAME = 'career-profiles';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    res.status(500).json({ error: 'Storage connection string is not configured.' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body: ProfileData = req.body;
      const session = (await getServerSession(req, res, authOptions)) as Session | null;
      if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const userId = getUserIdFromSession(session);
      const timestamp = new Date().toISOString();
      const blobName = `user-profile-${timestamp}.json`;

      // containerNameを追加
      await uploadJsonToBlob(CONTAINER_NAME, session, body);

      console.log('受信データ:', body);
      res.status(200).json({ message: 'Profile saved to Blob Storage!' });
    } catch (err) {
      console.error('Error saving to Blob Storage', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    const session = (await getServerSession(req, res, authOptions)) as Session | null;
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = getUserIdFromSession(session);
    const blob = req.query.blob as string | undefined;

    if (blob) {
      // Fetch specific blob content
      try {
        // containerNameを追加
        const jsonData = await downloadJsonFromBlob<ProfileData>(CONTAINER_NAME, session);
        res.status(200).json(jsonData);
      } catch (err) {
        console.error('Error reading blob:', err);
        res.status(500).json({ error: 'Failed to read blob' });
      }
    } else {
      // List blobs
      try {
        // containerNameを追加
        const blobs = await listProfileBlobNames(CONTAINER_NAME);
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