// /pages/api/talent/diagnosis/generate.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    // 1. DBからユーザープロフィールを取得
    const userProfile = await prisma.talentProfile.findUnique({
      where: { userId },
      include: {
        skills: { select: { skill: { select: { name: true } } } },
        certifications: { select: { certification: { select: { name: true } } } },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const latestInterview = await prisma.skillInterview.findFirst({
        where: { talentProfileId: userProfile.id, extractionStatus: 'COMPLETED' },
        orderBy: { updatedAt: 'desc' },
        include: { aiExtractedSkills: true }
    });
    const aiSkills = latestInterview?.aiExtractedSkills ?? [];

    // --- 2. プロンプトの生成 ---
    // AIに渡すための情報を整形
    const profileSummaryForAI = {
      ...userProfile,
      skills: userProfile.skills.map(s => s.skill.name),
      certifications: userProfile.certifications.map(c => c.certification.name),
      aiExtractedSkills: aiSkills.map(s => ({ skillName: s.skillName, category: s.category, level: s.level })),
    };

    // AIへの指示文
    const prompt = `
      あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
      以下のJSON形式のユーザープロフィールを分析し、キャリア診断を行ってください。
      特に "aiExtractedSkills" は、AIが客観的に判断したユーザーの潜在的な能力です。これを重視して分析してください。

      # ユーザープロフィール
      ${JSON.stringify(profileSummaryForAI, null, 2)}

      # 出力形式
      以下のキーを持つJSONオブジェクトを厳密に生成してください。
      - "summary": プロフィールの要約 (文字列)
      - "strengths": ユーザーの強み (文字列, Markdown形式)
      - "advice": 今後のアドバイス (文字列, Markdown形式)
      - "skillGapAnalysis": 目標達成のためのスキルギャップ分析 (文字列, Markdown形式)
      - "experienceMethods": 実務経験を積むための具体的な方法 (文字列, Markdown形式)
      - "roadmap": 学習ロードマップのステップ配列。各要素は以下のキーを持つオブジェクト。
        - "stepNumber": ステップ番号 (数値)
        - "title": ステップのタイトル (文字列)
        - "details": ステップの詳細オブジェクト。以下のキーを持つ。
          - "description": このステップの目的や概要 (文字列)
          - "recommendedActions": 推奨アクションの配列 (文字列の配列)
          - "referenceResources": 参考リソースの配列 (文字列の配列)
    `;

    // 3. OpenAI APIの呼び出し
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const resultJsonString = response.choices[0].message.content;
    if (!resultJsonString) {
      throw new Error('AIからの応答が空でした。');
    }

    // 4. 結果をDBに保存
    const diagnosisResult = JSON.parse(resultJsonString);

    const newAnalysis = await prisma.analysisResult.create({
      data: {
        talentProfileId: userProfile.id,
        summary: diagnosisResult.summary,
        strengths: diagnosisResult.strengths,
        advice: diagnosisResult.advice,
        skillGapAnalysis: diagnosisResult.skillGapAnalysis,
        experienceMethods: diagnosisResult.experienceMethods,
        // 関連するロードマップステップも同時に作成
        roadmapSteps: {
          create: diagnosisResult.roadmap.map((step: any) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            details: step.details, // detailsオブジェクトをJSON型カラムにそのまま保存
          })),
        },
      },
    });

    // 5. 作成された診断結果を返す
    return res.status(201).json(newAnalysis);

  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    if (error.code === 'insufficient_quota') {
       return res.status(429).json({ error: 'OpenAI APIの利用上限に達しました。'});
    }
    return res.status(500).json({ error: '診断中にサーバーエラーが発生しました。' });
  }
}
