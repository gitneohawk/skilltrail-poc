import type { CandidateProfile } from '@/types/CandidateProfile';
import type { DiagnosisResult } from '@/types/diagnosis-result';
import { NextApiRequest, NextApiResponse } from 'next';
import { buildSkillInterviewPrompt, buildSkillExtractionPrompt } from './skill-prompt';
import { buildPrompt } from './diagnosis-prompt';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callOpenAI(payload: any): Promise<any> {
  const response = await openai.chat.completions.create(payload);
  return response;
}

/**
 * callOpenAIWithSkillInterviewPrompt
 * ユーザーとアシスタントの会話履歴をもとに、職務経歴のヒアリング対話をOpenAI APIへリクエストする関数
 */
export async function callOpenAIWithSkillInterviewPrompt(
  profile: CandidateProfile,
  entries: { role: 'user' | 'assistant'; message: string }[]
): Promise<string> {
  const systemPrompt = buildSkillInterviewPrompt(profile);

  const payload = {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      ...entries.map((e) => ({ role: e.role, content: e.message })),
    ],
    temperature: 0.7,
  };

  const aiData = await callOpenAI(payload);
  return aiData.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function callOpenAIWithSkillExtractionPrompt(
  profile: CandidateProfile,
  entries: { role: 'user' | 'assistant'; message: string }[]
): Promise<string> {
  const systemPrompt = buildSkillExtractionPrompt(profile);

  const payload = {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      ...entries.map((e) => ({ role: e.role, content: e.message })),
    ],
    temperature: 0.7,
  };

  const aiData = await callOpenAI(payload);
  return aiData.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function callOpenAIWithDiagnosisPrompt(
  profile: CandidateProfile
): Promise<DiagnosisResult> {
  const prompt = buildPrompt(profile);
  const payload = {
    model: 'gpt-4',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
  };

  const aiData = await callOpenAI(payload);
  const reply = aiData.choices?.[0]?.message?.content?.trim() ?? '';
  return JSON.parse(reply);
}

type Entry = {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  timestamp: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { entries, profile } = req.body as { entries: Entry[]; profile: CandidateProfile };
    if (!entries || !Array.isArray(entries)) {
      res.status(400).json({ error: 'Invalid entries' });
      return;
    }

    const lastId = entries.length > 0 ? entries[entries.length - 1].id : 0;
    const timestamp = Date.now();

    const reply = await callOpenAIWithSkillInterviewPrompt(profile, entries);

    entries.push({ id: lastId + 2, role: 'assistant', message: reply, timestamp });

    res.status(200).json({ entries });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}