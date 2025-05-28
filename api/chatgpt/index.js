const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const userMessage = req.body?.message;
    if (!userMessage) {
      context.log("Missing message");
      context.res = {
        status: 400,
        body: "Missing 'message' in request body.",
      };
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      context.log("API Key missing");
      context.res = {
        status: 500,
        body: "Missing OpenAI API key.",
      };
      return;
    }

let systemPrompt = "";

switch (mode) {
  case "1":
    systemPrompt = "あなたは聞き上手で共感力の高いカウンセラーです。...";
    break;
  case "2":
    systemPrompt = "あなたは相手のプライバシーを最優先し、最低限の情報からキャリアのヒントを導き出すプロフェッショナルです。...";
    break;
  case "3":
    systemPrompt = "あなたは有能で頼れるキャリアアドバイザーです。相手の職歴、スキル、志向を深く聞き出し、的確な転職戦略を提示します。...";
    break;
}


    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await response.json();

    context.res = {
      status: 200,
      body: data.choices?.[0]?.message?.content || "No response",
    };
  } catch (err) {
    context.log("Error:", err.message);
    context.res = {
      status: 500,
      body: "Internal server error",
    };
  }
};
