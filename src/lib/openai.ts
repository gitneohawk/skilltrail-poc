import type { CandidateProfile } from '@/types/CandidateProfile';
import type { DiagnosisResult } from '@/types/diagnosis-result';
import { NextApiRequest, NextApiResponse } from 'next';
import { buildSkillInterviewPrompt, buildSkillExtractionPrompt, buildSkillStructuringAndNextQuestionPrompt } from './skill-prompt';
import { buildPromptForBlockStreaming } from './diagnosis-prompt';
import OpenAI from 'openai';

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const apiVersion = "2024-02-01";

if (!endpoint || !azureApiKey || !deploymentName) {
  throw new Error("Azure OpenAI Service is not configured. Please set environment variables.");
}

const openai = new OpenAI({
  apiKey: azureApiKey,
  baseURL: `${endpoint}openai/deployments/${deploymentName}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": azureApiKey },
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
  const prompt = buildPromptForBlockStreaming(profile);
  const payload = {
    model: 'gpt-4',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
  };

  const aiData = await callOpenAI(payload);
  const reply = aiData.choices?.[0]?.message?.content?.trim() ?? '';
  return JSON.parse(reply);
}

/**
 * スキル構造化＋次の質問生成を1リクエストで行う
 */
export async function callOpenAIWithSkillStructuringAndNextQuestion(
  profile: CandidateProfile,
  entries: { role: 'user' | 'assistant'; message: string }[]
): Promise<{ skills: any[]; nextQuestion: string }> {
  const systemPrompt = buildSkillStructuringAndNextQuestionPrompt(profile, entries);
  const payload = {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      ...entries.map((e) => ({ role: e.role, content: e.message })),
    ],
    temperature: 0.7,
  };
  const aiData = await callOpenAI(payload);
  const content = aiData.choices?.[0]?.message?.content?.trim() ?? '';
  let jsonText = content;
  try {
    // 先頭に余計なテキストが混じる場合に備え、最初の { から最後の } までを抽出
    const match = content.match(/{[\s\S]*}/);
    if (match) {
      jsonText = match[0];
    }
    const parsed = JSON.parse(jsonText);
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      nextQuestion: typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion : '',
    };
  } catch (e) {
    throw new Error('AI応答のJSONパースに失敗しました: ' + content);
  }
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
