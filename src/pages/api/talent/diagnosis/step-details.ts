// /pages/api/talent/diagnosis/step-details.ts

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { stepId } = req.query;
  if (typeof stepId !== 'string') {
    return res.status(400).json({ error: 'stepId is required' });
  }

  try {
    // 1. DBからステップ情報を取得
    const step = await prisma.learningRoadmapStep.findFirst({
      where: {
        id: stepId,
        // ログインユーザーの診断結果に紐づくステップであることも確認
        analysisResult: {
          talentProfile: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    // 2. キャッシュ（fullContent）を確認
    if (step.fullContent) {
      return res.status(200).json({ content: step.fullContent });
    }

    // 3. キャッシュがなければオンデマンドで生成
    const details = typeof step.details === 'string' ? JSON.parse(step.details) : step.details;

    const prompt = `
      あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
      以下の学習ステップについて、受講者が具体的なアクションを起こせるように、詳細な解説を生成してください。

      # 学習ステップの概要
      - タイトル: ${step.title}
      - 説明: ${details.description}
      - 推奨アクション: ${details.recommendedActions.join(', ')}
      - 参考リソース: ${details.referenceResources.join(', ')}

      # 出力要件
      - 上記の情報を元に、学習の目的、具体的な手順、注意点を詳しく解説してください。
      - 最終的なアウトプットは、見出し、リスト、強調などを含む、単一のMarkdownドキュメントとしてください。
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const markdownContent = response.choices[0].message.content || 'コンテンツを生成できませんでした。';

    // 4. 生成したコンテンツをDBにキャッシュとして保存
    await prisma.learningRoadmapStep.update({
      where: { id: stepId },
      data: { fullContent: markdownContent },
    });

    // 5. 生成したコンテンツを返す
    return res.status(200).json({ content: markdownContent });

  } catch (error) {
    console.error(`Step ${stepId} の詳細生成に失敗:`, error);
    return res.status(500).json({ error: 'Failed to generate detail content' });
  }
}
