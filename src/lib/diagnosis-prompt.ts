

import { CandidateProfile } from '@/types/CandidateProfile';

export function buildPrompt(profile: CandidateProfile): string {
  return `
あなたは熟練したキャリアアドバイザーです。以下の候補者プロフィールを分析し、キャリア診断を作成してください。

1. 簡潔な要約（候補者の現状や志向を要約）
2. 強みのリスト（候補者が現在持っているスキルや特長）
3. 今後のキャリアに向けた具体的なアドバイス（どのように成長すべきか）

加えて以下の3点を含めてください：
- 目指すキャリアとのギャップ分析（スキル、経験、資格など）
- 今後身につけるべきスキルとその習得順（キャリアパスとして5段階程度）
- 実務経験の積み方（例：インターン、プロジェクト参加、資格取得 など）

出力は以下のJSON形式に従ってください：
{
  "summary": "ここに要約を記載",
  "strengths": ["強み1", "強み2", ...],
  "recommendations": ["アドバイス1", "アドバイス2", ...],
  "skillGapAnalysis": "キャリアとのギャップを記述",
  "learningPath": ["習得すべきスキル1", "スキル2", ...],
  "practicalSteps": ["経験を積む方法1", "方法2", ...]
}

候補者プロフィール:
${JSON.stringify(profile)}
  `;
}