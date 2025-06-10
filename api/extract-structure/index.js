const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function (context, req) {
  const messages = req.body.messages;
  if (!messages || !Array.isArray(messages)) {
    context.res = {
      status: 400,
      body: { error: "messagesが不正です。" }
    };
    return;
  }

const prompt = `以下の会話ログから、ユーザーが関わった複数の勤務先（会社）ごとに職歴を分けてください。
それぞれの「会社名」「役職」「在籍期間」「職務内容（説明）」を抽出し、JSON形式で出力してください。
会話ログ内に複数社の記載がある場合、それぞれを個別の職歴として扱ってください。

出力例:
{
  "workHistory": [
    {
      "company": "A社",
      "role": "営業",
      "duration": "2015-2018",
      "description": "法人営業として新規顧客を開拓しました。"
    },
    {
      "company": "B株式会社",
      "role": "エンジニア",
      "duration": "2018-2022",
      "description": "サーバーサイド開発を担当しました。"
    }
  ]
}

会話ログ:
${messages.map(m => `${m.role}: ${m.message}`).join("\n")}
`;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "あなたは職歴情報の構造化に特化したアシスタントです。" },
        { role: "user", content: prompt }
      ]
    });

const responseText = chatCompletion.choices[0].message.content;
context.log("📦 OpenAI raw response:", responseText);

let parsed;
try {
  const cleanedText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  // JSONらしいかどうかを判定
  if (!cleanedText.startsWith("{") && !cleanedText.startsWith("[")) {
    // 職歴情報が含まれていない場合はOpenAIの戻りを無視し、空のworkHistoryを返す
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { workHistory: [] }
    };
    return;
  }

  parsed = JSON.parse(cleanedText);
} catch (e) {
  context.log("❌ JSON parse error:", e.message);
  // パースできない場合も空のworkHistoryを返す
  context.res = {
    headers: { "Content-Type": "application/json" },
    body: { workHistory: [] }
  };
  return;
}

    context.res = {
      headers: { "Content-Type": "application/json" },
      body: parsed
    };
  } catch (error) {
    context.log("❌ OpenAI構造化処理で致命的エラー:", error);
    context.res = {
      status: 500,
      body: { error: "構造化処理中にOpenAI呼び出しでエラーが発生しました。" }
    };
  }
};