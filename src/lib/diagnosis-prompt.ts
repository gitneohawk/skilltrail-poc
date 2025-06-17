

import { CandidateProfile } from '@/types/candidate-profile';

export function buildPrompt(profile: CandidateProfile): string {
  return `
あなたは熟練したキャリアアドバイザーです。以下の候補者プロフィールを分析し、キャリア診断を作成してください。

1. 簡潔な要約
2. 強みのリスト
3. 今後のキャリアに向けた具体的なアドバイス

出力は以下のJSON形式に従ってください：
{
  "summary": "ここに要約を記載",
  "strengths": ["強み1", "強み2", ...],
  "recommendations": ["アドバイス1", "アドバイス2", ...]
}

候補者プロフィール:
${JSON.stringify(profile)}
  `;
}