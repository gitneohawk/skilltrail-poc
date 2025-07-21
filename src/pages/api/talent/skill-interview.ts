import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.error("DEBUG: Unauthorized access - no session user ID.");
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // --- 会話履歴の取得 ---
  if (req.method === 'GET') {
    try {
      const interview = await prisma.skillInterview.findFirst({
        where: {
          talentProfile: { userId },
          status: 'IN_PROGRESS',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(interview?.messages ?? []);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get history' });
    }
  }
  if (req.method === 'POST') {
    try {
      // サーバーが現在読み込めている環境変数を取得する
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "Not Found";
      const azureApiKey = process.env.AZURE_OPENAI_KEY || "Not Found";
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "Not Found";

      // その値を、そのままJSONとしてフロントエンドに返す
      return res.status(200).json({
        message: "This is a debug response.",
        variables: {
          AZURE_OPENAI_ENDPOINT: endpoint,
          AZURE_OPENAI_KEY: `[Exists: ${azureApiKey !== "Not Found"}]`, // キー自体は表示せず、存在有無だけを確認
          AZURE_OPENAI_DEPLOYMENT_NAME: deploymentName,
        }
      });

    } catch (error) {
      const err = error as Error;
      return res.status(500).json({
        message: 'An error occurred during debug.',
        error_details: { name: err.name, message: err.message }
      });
    }
  }
  // if (req.method === 'POST') {
  //   const { message } = req.body;
  //   if (typeof message !== 'string' || !message.trim()) {
  //     console.error("DEBUG: Message is missing or invalid.");
  //     return res.status(400).json({ error: 'Message is required' });
  //   }

  //   try {
  //     // ★ 変更点: 最新のopenaiライブラリを使ったAzureクライアントの初期化
  //     const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  //     const azureApiKey = process.env.AZURE_OPENAI_KEY;
  //     const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  //     const apiVersion = "2024-02-01";

  //     if (!endpoint || !azureApiKey || !deploymentName) {
  //       throw new Error("Azure OpenAI Service is not configured. Please set environment variables.");
  //     }

  //     const client = new OpenAI({
  //       apiKey: azureApiKey,
  //       baseURL: `${endpoint}openai/deployments/${deploymentName}`,
  //       defaultQuery: { "api-version": apiVersion },
  //       defaultHeaders: { "api-key": azureApiKey },
  //     });

  //     const interview = await prisma.$transaction(async (tx) => {
  //       let currentInterview = await tx.skillInterview.findFirst({
  //         where: {
  //           talentProfile: { userId },
  //           status: 'IN_PROGRESS',
  //         },
  //         orderBy: { createdAt: 'desc' },
  //       });

  //       if (!currentInterview) {
  //         const profile = await tx.talentProfile.findUnique({ where: { userId } });
  //         if (!profile) throw new Error('Profile not found');
  //         currentInterview = await tx.skillInterview.create({
  //           data: {
  //             talentProfileId: profile.id,
  //           },
  //         });
  //       }

  //       await tx.skillInterviewMessage.create({
  //         data: {
  //           interviewId: currentInterview.id,
  //           role: 'user',
  //           content: message,
  //         },
  //       });

  //       return currentInterview;
  //     });

  //     const allMessages = await prisma.skillInterviewMessage.findMany({
  //       where: { interviewId: interview.id },
  //       orderBy: { createdAt: 'asc' },
  //     });

  //     const fullHistory: OpenAI.Chat.ChatCompletionMessageParam[] = allMessages.map(m => ({
  //       role: m.role as 'user' | 'assistant',
  //       content: m.content,
  //     }));

  //     // ★★★ ここからが修正点 ★★★
  //     // 常に最新10件のメッセージ（ユーザーとAIの5往復分）だけを履歴として使う
  //     const CONVERSATION_HISTORY_LIMIT = 10;
  //     const recentHistory = fullHistory.slice(-CONVERSATION_HISTORY_LIMIT);
  //     // ★★★ ここまでが修正点 ★★★

  //     const systemPrompt = `
  //       あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
  //       ユーザーのスキルや経験を深掘りするためのインタビューを行っています。
  //       以下の会話履歴に基づき、次の質問を生成してください。
  //       会話が5〜8往復程度になり、十分に情報を引き出せたと判断した場合は、インタビューを締めくくる言葉を返してください。

  //       # 出力形式
  //       以下のキーを持つJSONオブジェクトを厳密に生成してください。
  //       {
  //         "nextQuestion": "ユーザーへの次の質問、または最後の締めくくりの言葉（文字列）",
  //         "isFinished": "インタビューをここで終了すべきかどうかの真偽値（boolean）"
  //       }
  //     `;

  //     const response = await client.chat.completions.create({
  //       model: 'gpt-4o',
  //       messages: [
  //         { role: 'system', content: systemPrompt },
  //         // ★★★ 修正点: 全履歴ではなく、最新の履歴だけを渡す ★★★
  //         ...recentHistory
  //       ],
  //       response_format: { type: 'json_object' },
  //     });

  //     const resultJsonString = response.choices[0].message.content;
  //     if (!resultJsonString) throw new Error('AIからの応答が空でした。');

  //     const aiResponse = JSON.parse(resultJsonString);
  //     const nextQuestion = aiResponse.nextQuestion || 'エラーが発生しました。';
  //     const isFinished = aiResponse.isFinished === true;

  //     const assistantMessage = await prisma.skillInterviewMessage.create({
  //       data: {
  //         interviewId: interview.id,
  //         role: 'assistant',
  //         content: nextQuestion,
  //       },
  //     });

  //     if (isFinished) {
  //       fetch(`${process.env.NEXTAUTH_URL}/api/talent/skill-interview/extract/start`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ interviewId: interview.id }),
  //       });
  //     }

  //     return res.status(201).json(assistantMessage);

  //   } catch (error) {
  //     console.error('Failed to process interview message:', error);
  // const err = error as Error;
  // return res.status(500).json({
  //   message: 'An error occurred during the skill interview.',
  //   // エラーオブジェクト全体を返すと情報が多すぎる場合があるため、
  //   // 主要なプロパティを抽出して返す
  //   error_details: {
  //     name: err.name,
  //     message: err.message,
  //     stack: err.stack, // スタックトレース
  //   }
  // });    }
  // }

  // --- インタビューのリセット ---
  if (req.method === 'DELETE') {
    try {

      const latestInterview = await prisma.skillInterview.findFirst({
        where: {
          talentProfile: { userId },
          status: 'IN_PROGRESS',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestInterview) {
        await prisma.skillInterview.update({
          where: { id: latestInterview.id },
          data: { status: 'ARCHIVED' },
        });
      }
      return res.status(200).json({ success: true, message: 'Interview reset successfully.' });
    } catch (error) {
      console.error('Failed to reset interview:', error);
      return res.status(500).json({ error: 'Failed to reset interview' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
