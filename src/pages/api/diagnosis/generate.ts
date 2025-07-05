import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider } from '@/utils/azureBlob';
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { CandidateProfile } from '@/types/CandidateProfile';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const learningPlanContainerName = 'learning-plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const sendError = (message: string) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    res.end();
  };

  try {
    const { provider, sub } = req.query;

    if (typeof provider !== 'string' || typeof sub !== 'string') {
      return sendError('リクエストが無効です。');
    }

    const profile = await loadJsonFromBlobWithProvider<CandidateProfile>('career-profiles', provider, sub);

    if (!profile) {
      return sendError('プロフィールが見つかりませんでした。');
    }

    const prompt = DiagnosisPrompt.buildPromptForBlockStreaming(profile);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      stream: true,
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        type: 'function',
        function: {
          name: 'display_diagnosis_section',
          description: '診断結果の各セクションを表示する',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '要約' },
              strengths: { type: 'string', description: '強み' },
              recommendations: { type: 'string', description: '今後のアドバイス' },
              skillGapAnalysis: { type: 'string', description: 'スキルギャップ分析' },
              practicalSteps: { type: 'string', description: '実務経験を積む方法' },
              learningRoadmapJson: { type: 'string', description: '学習ロードマップのJSON文字列' },
            },
            required: ['summary', 'strengths', 'recommendations', 'skillGapAnalysis', 'practicalSteps', 'learningRoadmapJson'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'display_diagnosis_section' } },
    });

    let fullArguments = "";
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.tool_calls?.[0]?.function?.arguments || '';
      fullArguments += delta;
      res.write(`data: ${delta}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    // --- ストリーム終了後の追加処理 ---
    try {
      const finalJson = JSON.parse(fullArguments);
      const roadmapData = JSON.parse(finalJson.learningRoadmapJson);
      await saveJsonToBlobWithProvider(learningPlanContainerName, provider, sub, roadmapData);
      console.log('学習計画をBlobに保存しました。');
    } catch (e) {
      console.error("学習計画の保存に失敗しました:", e);
    }

  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    sendError('診断中にサーバーエラーが発生しました。');
    }
  }
