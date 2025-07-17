// /api/talent/skill-interview/extract/execute.ts (最終修正版)

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
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

type AiSkill = { skillName: string; level: number; category: string; };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { interviewId } = req.body;
  if (typeof interviewId !== 'string') {
    return res.status(400).json({ error: 'interviewId is required' });
  }

  res.status(202).end();

  try {
    const interview = await prisma.skillInterview.findUnique({
      where: { id: interviewId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!interview) throw new Error('Interview not found for processing.');

    const conversationText = interview.messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n---\n\n');

    // ★ 変更点: プロンプトを更新し、役割やソフトスキルも抽出するよう指示
    const prompt = `
      あなたはHRテック企業のデータサイエンティストです。
      以下のユーザーとのスキルインタビューの会話履歴を分析し、ユーザーが保有している能力を抽出・構造化してください。

      # 抽出する能力のカテゴリ
      1.  **技術スキル**: プログラミング言語、フレームワーク、データベース、クラウドサービス、セキュリティツールなど。
      2.  **役割・経験**: チームリーダー、マネージャー、PMO、アーキテクトなど、具体的な役割や職務経験。
      3.  **ソフトスキル**: コミュニケーション能力、問題解決能力、粘り強さ、学習意欲、パッションなど、人物像を表すスキル。

      # 会話履歴
      ${conversationText}

      # 出力形式
      以下のキーを持つJSONオブジェクトを生成してください。
      {
        "skills": [
          {
            "skillName": "抽出した能力名",
            "level": "習熟度や確信度を1(少し言及)から5(強く示唆)の5段階で評価した数値",
            "category": "上記3つのカテゴリのいずれか（技術スキル, 役割・経験, ソフトスキル）"
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const resultJsonString = response.choices[0].message.content;
    if (!resultJsonString) throw new Error('AIからの応答が空でした。');

    const parsedResult = JSON.parse(resultJsonString);
    const extractedSkills: AiSkill[] = parsedResult.skills || [];
    if (extractedSkills.length === 0) {
      throw new Error("AI could not extract any skills.");
    }

    // ★ 変更点: 新しいAiExtractedSkillテーブルに、照合なしでそのまま保存
    await prisma.$transaction(async (tx) => {
      // 既存のAI抽出スキルがあれば削除
      await tx.aiExtractedSkill.deleteMany({ where: { interviewId: interviewId } });

      // AIの出力をDBに保存
      const skillsToSave = extractedSkills.map(skill => {
        const levelAsInt = parseInt(String(skill.level), 10);
        return {
          interviewId: interviewId,
          skillName: skill.skillName,
          category: skill.category,
          level: !isNaN(levelAsInt) ? levelAsInt : null,
        }
      });
      await tx.aiExtractedSkill.createMany({ data: skillsToSave });

      // インタビューのステータスを更新
      await tx.skillInterview.update({
        where: { id: interviewId },
        data: { status: 'COMPLETED', extractionStatus: 'COMPLETED' },
      });
    });

  } catch (error) {
    console.error(`Extraction for interview ${interviewId} failed:`, error);
    await prisma.skillInterview.update({
      where: { id: interviewId },
      data: { extractionStatus: 'FAILED', extractionError: (error as Error).message },
    });
  }
}
