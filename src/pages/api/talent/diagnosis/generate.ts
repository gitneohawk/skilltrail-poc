// /pages/api/talent/diagnosis/generate.ts (最終修正版)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  try {
    const userProfile = await prisma.talentProfile.findUnique({
      where: { userId },
      include: {
        skills: { select: { skill: { select: { name: true } } } },
        certifications: { select: { certification: { select: { name: true } } } },
        skillInterviews: {
          where: { extractionStatus: 'COMPLETED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: { aiExtractedSkills: true }
        }
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const profileSummaryForAI = {
      ...userProfile,
      skills: userProfile.skills.map(s => s.skill.name),
      certifications: userProfile.certifications.map(c => c.certification.name),
      aiExtractedSkills: userProfile.skillInterviews[0]?.aiExtractedSkills ?? [],
    };
    delete (profileSummaryForAI as any).skillInterviews;

    let prompt: string;
    const outputFormat = `
      # 出力形式
      以下のキーを持つJSONオブジェクトを厳密に生成してください。
      - "summary": 分析の要約 (文字列)
      - "strengths": 分析の根拠となったユーザーの強み (文字列, Markdown形式)
      - "advice": 今後のアドバイス (文字列, Markdown形式)
      - "skillGapAnalysis": 目標達成のためのスキルギャップ分析 (文字列, Markdown形式)
      - "experienceMethods": 実務経験を積むための具体的な方法 (文字列, Markdown形式)
      - "roadmap": 提案する学習ロードマップのステップ配列。各要素は以下のキーを持つオブジェクト。
        - "stepNumber": ステップ番号 (数値)
        - "title": ステップのタイトル (文字列)
        - "details": { "description": "このステップの目的や概要", "recommendedActions": ["具体的なアクション1", "アクション2"], "referenceResources": ["参考情報1", "情報2"] }
    `;

    if (userProfile.needsCareerSuggestion) {
      // ケースB: キャリア提案型プロンプト
      prompt = `
        あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
        以下のユーザープロフィールを分析し、ユーザーのスキルや経験に合った、将来性のあるキャリアパスを3つ提案してください。
        提案するキャリアパスは、それぞれ学習ロードマップのステップとして構造化してください。

        # ユーザープロフィール
        ${JSON.stringify(profileSummaryForAI, null, 2)}

        ${outputFormat}
      `;
    } else {
      // ケースA: 従来のギャップ分析型プロンプト
      prompt = `
        あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
        以下のユーザープロフィールと、本人が希望するキャリアを分析し、ギャップを埋めるための具体的なアドバイスと学習ロードマップを生成してください。

        # ユーザープロフィール
        ${JSON.stringify(profileSummaryForAI, null, 2)}

        ${outputFormat}
      `;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const resultJsonString = response.choices[0].message.content;
    if (!resultJsonString) throw new Error('AIからの応答が空でした。');

    const diagnosisResult = JSON.parse(resultJsonString);

    const newAnalysis = await prisma.analysisResult.create({
      data: {
        talentProfileId: userProfile.id,
        summary: diagnosisResult.summary,
        strengths: diagnosisResult.strengths,
        advice: diagnosisResult.advice,
        skillGapAnalysis: diagnosisResult.skillGapAnalysis,
        experienceMethods: diagnosisResult.experienceMethods,
        roadmapSteps: {
          create: diagnosisResult.roadmap.map((step: any) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            details: step.details,
          })),
        },
      },
    });

    return res.status(201).json(newAnalysis);

  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    return res.status(500).json({ error: '診断中にサーバーエラーが発生しました。' });
  }
}
