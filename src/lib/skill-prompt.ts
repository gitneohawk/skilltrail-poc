
/**
 * スキル構造化のためのプロンプトを生成
 */
export function buildSkillExtractionPrompt(profile: CandidateProfile): string {
  return `
以下の職務経歴情報から、ユーザーの持つスキルや知識、専門性を洗い出してください。

参考プロフィール情報:
${JSON.stringify(profile, null, 2)}

--- 出力形式 ---
- スキル名
- 分類（例: プログラミング言語、業務知識、マネジメントなど）
- レベル（初級・中級・上級のいずれか）
- 補足説明（任意）

日本語でJSON配列形式で出力してください。
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