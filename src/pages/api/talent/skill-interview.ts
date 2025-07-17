// /pages/api/talent/skill-interview.ts

console.log("ULTRA_DEBUG: API file started loading.");

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
// import prisma from '@/lib/prisma'; // Prisma関連は一時的にコメントアウト
// import OpenAI from 'openai'; // OpenAI関連も一時的にコメントアウト
// import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'; // 同上

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("DEBUG: Handler function entered.");

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    console.error("DEBUG: Unauthorized access - no session user ID.");
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  // --- 会話履歴の取得 ---
  if (req.method === 'GET') {
    try {
            console.log("DEBUG: GET method called.");

      // const interview = await prisma.skillInterview.findFirst({
      //   where: {
      //     talentProfile: { userId },
      //     status: 'IN_PROGRESS',
      //   },
      //   include: {
      //     messages: {
      //       orderBy: { createdAt: 'asc' },
      //     },
      //   },
      //   orderBy: { createdAt: 'desc' },
      // });
      // return res.status(200).json(interview?.messages ?? []);
            return res.status(200).json([]); // GETは空配列を返すようにする
    } catch (error) {
      console.error('DEBUG: Failed to get interview history:', error);
      return res.status(500).json({ error: 'Failed to get history' });
    }
  }

  // --- 新しいメッセージの投稿とAIの応答 (POSTメソッドを最小限にする) ---
  if (req.method === 'POST') {
    const { message } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      console.error("DEBUG: Message is missing or invalid.");
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      console.log("DEBUG: POST method try block entered.");
      console.log(`DEBUG: Received message: "${message}" for userId: "${userId}"`);
      console.log("DEBUG: /api/talent/skill-interview API called."); // API呼び出しの開始ログ
      // if (!process.env.OPENAI_API_KEY) {
      //   console.error("DEBUG: OPENAI_API_KEY is not set in environment variables!");
      //   // 環境変数がない場合は、より具体的なエラーをスローして捕捉させる
      //   throw new Error("OpenAI API Key is not configured. Please set OPENAI_API_KEY environment variable.");
      // }
      // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      // const interview = await prisma.$transaction(async (tx) => {
      //   let currentInterview = await tx.skillInterview.findFirst({
      //     where: {
      //       talentProfile: { userId },
      //       status: 'IN_PROGRESS',
      //     },
      //     orderBy: { createdAt: 'desc' },
      //   });

      //   if (!currentInterview) {
      //     const profile = await tx.talentProfile.findUnique({ where: { userId } });
      //     if (!profile) throw new Error('Profile not found');
      //     currentInterview = await tx.skillInterview.create({
      //       data: {
      //         talentProfileId: profile.id,
      //       },
      //     });
      //   }

      //   await tx.skillInterviewMessage.create({
      //     data: {
      //       interviewId: currentInterview.id,
      //       role: 'user',
      //       content: message,
      //     },
      //   });

      //   return currentInterview;
      // });

      // const allMessages = await prisma.skillInterviewMessage.findMany({
      //   where: { interviewId: interview.id },
      //   orderBy: { createdAt: 'asc' },
      // });

      // ★ 修正点: `role` の型をOpenAIライブラリが期待する型に明示的に合わせる
      // const formattedHistory: ChatCompletionMessageParam[] = allMessages.map(m => ({
      //   role: m.role as 'user' | 'assistant',
      //   content: m.content,
      // }));

      // ★ 変更点: プロンプトを修正し、JSONでisFinishedフラグを要求
      // const systemPrompt = `
      //   あなたは優秀なIT・セキュリティ業界専門のキャリアコンサルタントです。
      //   ユーザーのスキルや経験を深掘りするためのインタビューを行っています。
      //   以下の会話履歴に基づき、次の質問を生成してください。
      //   会話が5〜8往復程度になり、十分に情報を引き出せたと判断した場合は、インタビューを締めくくる言葉を返してください。

      //   # 出力形式
      //   以下のキーを持つJSONオブジェクトを厳密に生成してください。
      //   {
      //     "nextQuestion": "ユーザーへの次の質問、または最後の締めくくりの言葉（文字列）",
      //     "isFinished": "インタビューをここで終了すべきかどうかの真偽値（boolean）"
      //   }
      // `;

      // const response = await openai.chat.completions.create({
      //   model: 'gpt-4-turbo',
      //   messages: [
      //     { role: 'system', content: systemPrompt },
      //     ...formattedHistory
      //   ],
      //   response_format: { type: 'json_object' },
      // });

      // const resultJsonString = response.choices[0].message.content;
      // if (!resultJsonString) throw new Error('AIからの応答が空でした。');

      // // ★ 変更点: AIの応答からnextQuestionとisFinishedをパース
      // const aiResponse = JSON.parse(resultJsonString);
      // const nextQuestion = aiResponse.nextQuestion || 'エラーが発生しました。';
      // const isFinished = aiResponse.isFinished === true;

      // // AIの応答を保存
      // const assistantMessage = await prisma.skillInterviewMessage.create({
      //   data: {
      //     interviewId: interview.id,
      //     role: 'assistant',
      //     content: nextQuestion,
      //   },
      // });

      // ★ 変更点: isFinishedフラグがtrueなら、自動でスキル抽出処理を開始
      // if (isFinished) {
      //   // fire-and-forgetで抽出APIを呼び出す
      //   fetch(`${process.env.NEXTAUTH_URL}/api/talent/skill-interview/extract/start`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ interviewId: interview.id }),
      //   });
      // }

      console.log("DEBUG: Returning successful mock response from POST.");
      return res.status(201).json({
        status: 'success',
        message: 'Mock response from API. This indicates API is loading and logging.',
        content: `モック応答: ${message} について、さらに詳しく教えていただけますか？` // フロントエンドで表示される内容
      });


      // AIの自然言語応答をフロントエンドに返す
      // return res.status(201).json(assistantMessage);

  //   } catch (error) {
  //     console.error('Failed to process interview message:', error);
  //     return res.status(500).json({ error: 'Failed to process message' });
  //   }
  // }
} catch (error: any) {
      console.error('DEBUG: !!! FATAL ERROR in /api/talent/skill-interview POST catch block:', error.message || error.toString(), error.stack);
      return res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
  }

  // --- インタビューのリセット ---
  if (req.method === 'DELETE') {
    try {
            console.log("DEBUG: DELETE method called.");

      // const latestInterview = await prisma.skillInterview.findFirst({
      //   where: {
      //     talentProfile: { userId },
      //     status: 'IN_PROGRESS',
      //   },
      //   orderBy: { createdAt: 'desc' },
      // });

      // if (latestInterview) {
      //   await prisma.skillInterview.update({
      //     where: { id: latestInterview.id },
      //     data: { status: 'ARCHIVED' },
      //   });
      // }
      return res.status(200).json({ success: true, message: 'Interview reset successfully.' });
    } catch (error) {
      console.error('Failed to reset interview:', error);
      return res.status(500).json({ error: 'Failed to reset interview' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
