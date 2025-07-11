import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider } from '@/utils/azureBlob';
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { CandidateProfile } from '@/types/CandidateProfile';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const learningPlanContainerName = 'learning-plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    const prompt = DiagnosisPrompt.buildPromptForBlockStreaming(profile);

    // ストリーミングせず、一度に結果を取得
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }, // JSONモードを有効化
    });

    const resultJsonString = response.choices[0].message.content;
    if (!resultJsonString) {
      throw new Error('AIからの応答が空でした。');
    }

    const diagnosisResult = JSON.parse(resultJsonString);

    // 学習ロードマップ部分を抽出し、Blobに保存
    if (diagnosisResult.learningRoadmapJson) {
      const roadmapData = JSON.parse(diagnosisResult.learningRoadmapJson);
      await saveJsonToBlobWithProvider(learningPlanContainerName, provider, sub, roadmapData);
      console.log('学習計画をBlobに保存しました。');
    }

    // 完全なJSONオブジェクトをクライアントに返す
    res.status(200).json(diagnosisResult);

  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    res.status(500).json({ error: '診断中にサーバーエラーが発生しました。' });
  }
}
