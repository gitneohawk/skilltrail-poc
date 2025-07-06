import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider } from '@/utils/azureBlob';
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { CandidateProfile } from '@/types/CandidateProfile';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const learningPlanContainerName = 'learning-plans';

/**
 * 学習ロードマップのJSONを生成し、Blobに保存するAPI
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const provider = 'azure';
  const sub = session.user.sub;

  try {
    const profile = await loadJsonFromBlobWithProvider<CandidateProfile>('career-profiles', provider, sub);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const prompt = DiagnosisPrompt.buildPromptForRoadmapJson(profile);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }, // JSONモードを有効化
    });

    const roadmapJsonString = response.choices[0].message.content;
    if (!roadmapJsonString) {
      throw new Error('AIからの応答が空でした。');
    }

    const roadmapData = JSON.parse(roadmapJsonString);

    // Blobに保存
    await saveJsonToBlobWithProvider(learningPlanContainerName, provider, sub, roadmapData);

    res.status(200).json({ success: true, message: '学習計画が作成されました。' });

  } catch (error: any) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
