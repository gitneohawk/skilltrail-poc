import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

type ProfileData = {
  ageRange: string;
  location: string;
  experiences: {
    company: string;
    position: string;
    start: string;
    end: string;
  }[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const profile: ProfileData = req.body;

  const prompt = `
あなたはキャリアコンサルタントです。
以下のプロファイル情報をもとに、キャリアアドバイスを簡潔に出力してください（300文字以内、できるだけ専門用語を避け、わかりやすく）:

年齢範囲: ${profile.ageRange}
地域: ${profile.location}
職務経歴:
${profile.experiences.map((exp, idx) => 
  `${idx + 1}. 会社名: ${exp.company}, 役職: ${exp.position}, 開始: ${exp.start}, 終了: ${exp.end}`
).join('\n')}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたは経験豊富なキャリアコンサルタントです。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content || '診断が生成できませんでした。';
    res.status(200).json({ result: aiResponse });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'AI診断に失敗しました' });
  }
}