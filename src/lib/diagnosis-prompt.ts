import { CandidateProfile } from '@/types/CandidateProfile';

export function buildPromptForBlockStreaming(profile: CandidateProfile): string {
  // learningRoadmapJsonに含めてほしい詳細な情報をプロンプトで指示
  const roadmapJsonSchema = `[
    { "stage": 1, "title": "ステップ1のタイトル", "skills": ["習得スキル1", "習得スキル2"], "actions": ["具体的なアクション1"], "resources": ["参考リソース1"] },
    { "stage": 2, "title": "ステップ2のタイトル", "skills": ["習得スキル3"], "actions": ["具体的なアクション2"], "resources": ["参考リソース2"] }
  ]`;

  return `あなたは熟練したキャリアアドバイザーです。以下の候補者プロフィールを分析し、キャリア診断を作成してください。

出力は必ず以下のルールに従ってください。

# 指示
1.  診断結果を、以下のキーを持つJSONオブジェクトとして生成してください: "summary", "strengths", "recommendations", "skillGapAnalysis", "practicalSteps"。
2.  各キーの値は、人間が読むための自然な文章（Markdown形式）にしてください。
3.  **【最重要】"learningRoadmapJson"というキーも追加し、その値には学習計画の構造化データ（JSON文字列）を格納してください。このJSONは必ず以下のスキーマに従ってください: ${roadmapJsonSchema}**

# 候補者プロフィール
${JSON.stringify(profile, null, 2)}
`;
}
