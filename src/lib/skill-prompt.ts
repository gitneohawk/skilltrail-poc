/**
 * スキル構造化のためのプロンプトを生成
 */
export function buildSkillExtractionPrompt(profile: CandidateProfile): string {
  return `
以下の職務経歴情報から、ユーザーの持つスキルや知識、専門性を洗い出してください。

参考プロフィール情報:
${JSON.stringify(profile, null, 2)}

--- 出力形式 ---
[{
  "skillName": "スキル名",
  "category": "分類（例: プログラミング言語、業務知識、マネジメントなど）",
  "level": "初級|中級|上級",
  "description": "補足説明（任意）"
}]

必ず上記のJSON配列形式のみで出力してください。文章や説明は不要です。
  `.trim();
}

import type { CandidateProfile } from '@/types/CandidateProfile';

/**
 * スキルインタビュー用のプロンプトを生成
 */
export function buildSkillInterviewPrompt(profile: CandidateProfile): string {
  return `
あなたは熟練のキャリアカウンセラーです。
今から、ユーザーの職務経歴について丁寧にヒアリングしてください。

参考プロフィール情報:
${JSON.stringify(profile, null, 2)}

--- ルール ---
- 一度に複数の質問はせず、1つずつ聞いてください。
- なるべくユーザーの言葉を引き出すようにしてください。
- 「その経験から学んだことは何ですか？」「当時、どんな工夫をしましたか？」などの掘り下げ質問も交えてください。
- 突然アドバイスや分析はせず、ユーザーの話をよく聞きましょう。
- 老師らしい柔らかい語り口調で、質問ごとに一言コメントを添えてください。

まずは、これまでの職歴の概要について質問してください。
  `.trim();
}

/**
 * スキル構造化＋次の質問生成の複合プロンプトを生成
 */
export function buildSkillStructuringAndNextQuestionPrompt(profile: CandidateProfile, entries: any[]): string {
  return `
あなたは熟練のキャリアカウンセラーです。以下の会話履歴とプロフィール情報をもとに、
1. ユーザーのスキル・知識・専門性をJSON配列で構造化
2. 次にユーザーへ聞くべき質問を1つ日本語で生成してください。

【インタビュー終了ルール】
- ユーザーが「スキルセット終了」「これで終わり」「もう十分です」など終了を示す発言をした場合、インタビューを終了してください。
- また、十分な情報が得られたとAIが判断した場合もインタビューを終了してください。
- インタビューは5〜8往復程度で十分な情報が得られるようにまとめてください。
- 必要以上に細かく深掘りしすぎないようにしてください。
- 終了時は nextQuestion を null にし、assistantの返答で「インタビューを終了します」などの旨を伝えてください。

【プロフィール情報】
${JSON.stringify(profile, null, 2)}

【会話履歴】
${JSON.stringify(entries, null, 2)}

--- 出力形式 ---
{
  "skills": [
    {
      "skillName": "スキル名",
      "category": "分類（例: プログラミング言語、業務知識、マネジメントなど）",
      "level": "初級|中級|上級",
      "description": "補足説明（任意）"
    }
  ],
  "nextQuestion": "次の質問（日本語で1つ、終了時はnull）"
}

必ず上記のJSONオブジェクト形式のみで出力してください。説明や補足文は不要です。
  `.trim();
}