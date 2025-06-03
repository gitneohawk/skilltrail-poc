const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

module.exports = async function (context, req) {
  const messages = req.body.messages;
  if (!messages || !Array.isArray(messages)) {
    context.res = {
      status: 400,
      body: { error: "messagesが不正です。" }
    };
    return;
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

  const prompt = `以下の会話ログから、ユーザーの職歴を複数の勤務先に分けてJSONで出力してください。
出力形式は以下の構造でお願いします。

{
  "workHistory": [
    {
      "company": "...",
      "role": "...",
      "duration": "...",
      "description": "..."
    },
    ...
  ]
}

会話ログ:
${messages.map(m => `${m.role}: ${m.message}`).join("\n")}
`;

 try {
  const completion = await client.getChatCompletions(deployment, [
    { role: "system", content: "あなたは職歴情報の構造化に特化したアシスタントです。" },
    { role: "user", content: prompt }
  ]);

  const responseText = completion.choices[0].message.content;
  context.log("📦 OpenAI raw response:", responseText);

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    context.log("❌ JSON parse error:", e.message);
    context.res = {
      status: 500,
      body: {
        error: "JSON parse error",
        message: e.message,
        raw: responseText
      }
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