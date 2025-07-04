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
    console.error('Storage connection string is not configured. Please check your environment variables.');
    res.status(500).json({ error: 'Storage connection string is not configured.' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body: ProfileData = req.body;
      const session = (await getServerSession(req, res, authOptions)) as Session | null;
      if (!session) {
        console.error('Unauthorized access attempt.');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const userId = getUserIdFromSession(session);
      const timestamp = new Date().toISOString();
      const blobName = `user-profile-${timestamp}.json`;

      await uploadJsonToBlob(CONTAINER_NAME, session, body);

      console.log('Received data:', body);
      res.status(200).json({ message: 'Profile saved to Blob Storage!' });
    } catch (err) {
      console.error('Error saving to Blob Storage:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    const session = (await getServerSession(req, res, authOptions)) as Session | null;
    if (!session) {
      console.error('Unauthorized access attempt.');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = getUserIdFromSession(session);
    const blob = req.query.blob as string | undefined;

    if (blob) {
      try {
        const jsonData = await downloadJsonFromBlob<ProfileData>(CONTAINER_NAME, session);
        if (!jsonData) {
          console.error('Blob content is empty or invalid.');
          res.status(404).json({ error: 'Blob not found or content is invalid.' });
          return;
        }
        res.status(200).json(jsonData);
      } catch (err) {
        console.error('Error reading blob:', err);
        res.status(500).json({ error: 'Failed to read blob' });
      }
    } else {
      try {
        const blobs = await listProfileBlobNames(CONTAINER_NAME);
        res.status(200).json({ blobs });
      } catch (err) {
        console.error('Error listing blobs:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  } else {
    console.error('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
