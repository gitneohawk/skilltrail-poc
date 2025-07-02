import type { NextApiRequest, NextApiResponse } from 'next';
import { getDailyQuiz } from '@/utils/quiz';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const quiz = await getDailyQuiz();
    if (!quiz) {
      // quizがnull/undefinedの場合は空オブジェクトを返す
      return res.status(200).json({});
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error('[quiz/daily] error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
}
