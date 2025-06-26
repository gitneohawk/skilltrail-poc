import { NextApiRequest, NextApiResponse } from 'next';
import { callOpenAIWithSkillExtractionPrompt } from '@/utils/ai/skillExtraction';
import { SkillInterviewBlob, StructuredSkillsBlob } from '@/types/SkillInterviewBlob';
import { uploadJsonToBlob } from '@/utils/azureBlob';

const CONTAINER_NAME = 'career-profiles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, blob } = req.body as { userId: string; blob: SkillInterviewBlob };

  if (!userId || !blob) {
    return res.status(400).json({ error: 'Missing userId or blob' });
  }

  try {
    const extractedSkills: StructuredSkillsBlob = await callOpenAIWithSkillExtractionPrompt(blob);

    return res.status(200).json({ success: true, extractedSkills });
  } catch (error) {
    console.error('[SkillExtraction API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}