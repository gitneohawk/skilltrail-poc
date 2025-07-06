import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { loadJsonFromBlobWithProvider } from '@/utils/azureBlob';
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { CandidateProfile } from '@/types/CandidateProfile';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * テキスト部分の診断結果をストリーミングで返すAPI
 */
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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  try {
    const profile = await loadJsonFromBlobWithProvider<CandidateProfile>('career-profiles', provider, sub);
    if (!profile) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'プロフィールが見つかりませんでした。' })}\n\n`);
      res.end();
      return;
    }

    const prompt = DiagnosisPrompt.buildPromptForTextDiagnosis(profile);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || '';
      res.write(`data: ${content}\n\n`);
    }

  } catch (error: any) {
    console.error('Text diagnosis generation error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: '診断中にサーバーエラーが発生しました。' })}\n\n`);
  } finally {
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
