import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 診断のメインロジックを実行する非同期関数
async function runDiagnosis(analysisId: string) {
  try {
    const analysisResult = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      include: {
        talentProfile: {
          include: {
            skills: { select: { skill: { select: { name: true } } } },
            certifications: { select: { certification: { select: { name: true } } } },
            skillInterviews: {
              where: { extractionStatus: 'COMPLETED' },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              include: { aiExtractedSkills: true }
            }
          }
        }
      }
    });

    if (!analysisResult || !analysisResult.talentProfile) {
      throw new Error('Analysis or profile not found for processing.');
    }
    const { talentProfile } = analysisResult;

    const profileSummaryForAI = {
      desiredJobTitles: talentProfile.desiredJobTitles,
      careerSummary: talentProfile.careerSummary,
      userSkills: talentProfile.skills.map(s => s.skill.name),
      userCertifications: talentProfile.certifications.map(c => c.certification.name),
      aiExtractedSkills: talentProfile.skillInterviews[0]?.aiExtractedSkills ?? [],
    };

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

    let instruction: string;
    if (talentProfile.needsCareerSuggestion) {
      instruction = `以下のユーザープロフィールを分析し、ユーザーのスキルや経験に合った、将来性のあるキャリアパスを3つ提案してください。提案は必ず指定されたJSON形式で返してください。`;
    } else {
      instruction = `以下のユーザープロフィールと、本人が希望するキャリアを分析し、ギャップを埋めるための具体的なアドバイスと学習ロードマップを生成してください。分析結果は必ず指定されたJSON形式で返してください。`;
    }

    const prompt = `
      あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
      ${instruction}
      # ユーザープロフィール
      ${JSON.stringify(profileSummaryForAI, null, 2)}
      ${outputFormat}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const resultJsonString = response.choices[0].message.content;
    if (!resultJsonString) throw new Error('AI response was empty.');
    const diagnosisResult = JSON.parse(resultJsonString);

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        summary: diagnosisResult.summary,
        strengths: diagnosisResult.strengths,
        advice: diagnosisResult.advice,
        skillGapAnalysis: diagnosisResult.skillGapAnalysis,
        experienceMethods: diagnosisResult.experienceMethods,
        diagnosisStatus: 'COMPLETED',
        roadmapSteps: {
          create: diagnosisResult.roadmap.map((step: any) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            details: step.details,
          })),
        },
      },
    });

  } catch (error) {
    console.error(`Diagnosis execution for ${analysisId} failed:`, error);
    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: { diagnosisStatus: 'FAILED' },
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { analysisId } = req.body;
  if (typeof analysisId !== 'string') {
    return res.status(400).json({ error: 'analysisId is required' });
  }

  res.status(202).end();
  await runDiagnosis(analysisId);
}
