import { CandidateProfile } from '@/types/CandidateProfile';

export function buildPrompt(profile: CandidateProfile): string {
  const age = profile.basicInfo.age ?? null; // 未入力の場合はnullを渡す

  return `
あなたは熟練したキャリアアドバイザーです。以下の候補者プロフィールを分析し、キャリア診断を作成してください。

1. 要約（候補者の現状や志向を簡潔に）
2. 強みのリスト
3. キャリアに向けたアドバイス

さらに以下を含めてください：

- 目指すキャリアとのギャップ（スキル・経験・資格）
- 学習ロードマップ（3～5段階、各ステージに「習得スキル」「推奨アクション」「参考リソース」含む）
- 実務経験の積み方（例：インターン、プロジェクト参加、資格取得 など）

出力は以下のJSON形式にしてください：

{
  "summary": "ここに要約を記載",
  "strengths": ["強み1", "強み2", ...],
  "recommendations": ["アドバイス1", "アドバイス2", ...],
  "skillGapAnalysis": "キャリアとのギャップを記述",
  "learningRoadmap": [
    {
      "stage": 1,
      "title": "基礎知識の強化",
      "skills": ["スキルA", "スキルB"],
      "actions": ["資格取得", "オンラインコース受講"],
      "resources": ["UdemyのXXX講座", "書籍：セキュリティ入門"]
    },
    {
      "stage": 2,
      ...
    }
  ],
  "practicalSteps": ["実務経験を積む方法1", "方法2", ...]
}

候補者プロフィール:
${JSON.stringify(profile)}
  `;
}
