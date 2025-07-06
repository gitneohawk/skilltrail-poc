import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { deleteUserLearningPlanDetails } from '@/utils/azureBlob';

const learningPlanDetailsContainerName = 'learning-plan-details';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await deleteUserLearningPlanDetails(learningPlanDetailsContainerName, session.user.sub);
    res.status(200).json({ success: true, message: 'Old learning plan details deleted.' });
  } catch (error) {
    console.error('Error deleting learning plan details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
