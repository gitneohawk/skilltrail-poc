import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider, saveTextToBlob } from '@/utils/azureBlob';
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { CandidateProfile } from '@/types/CandidateProfile';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const learningPlanContainerName = 'learning-plans';
const learningPlanDetailsContainerName = 'learning-plan-details';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  try {
    const { provider, sub } = req.query;
    if (typeof provider !== 'string' || typeof sub !== 'string') {
      res.end(); // エラー時はストリームを閉じる
      return;
    }

    const profile = await loadJsonFromBlobWithProvider<CandidateProfile>('career-profiles', provider, sub);
    if (!profile) {
      res.end(); // エラー時はストリームを閉じる
      return;
    }

    // Function Callingをやめ、シンプルなテキスト生成用のプロンプトを呼び出す
    const prompt = DiagnosisPrompt.buildPromptForBlockStreaming(profile);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    });

    let fullResponse = "";
    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || '';
      fullResponse += content;
      res.write(`data: ${content}\n\n`); // テキストの断片をそのまま送信
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    // --- ストリーム完了後の非同期処理 ---
     try {
      const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const roadmapData = JSON.parse(jsonMatch[1]);
        if (roadmapData.learningRoadmap) {
          // 概要の保存のみ行う
          await saveJsonToBlobWithProvider('learning-plans', provider, sub, roadmapData.learningRoadmap);
          console.log('学習計画の概要をBlobに保存しました。');
        }
      }
    } catch (e) {
      console.error("学習計画の概要保存に失敗しました:", e);
    }

  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    res.end();
  }
}
