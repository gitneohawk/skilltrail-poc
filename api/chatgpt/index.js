const getClientPrincipal = (req) => {
  const encoded = req.headers["x-ms-client-principal"];
  if (!encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  try {
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
};

const fetch = require("node-fetch");

module.exports = async function (context, req) {
const clientPrincipal = getClientPrincipal(req);
const userId = clientPrincipal?.userId || "anonymous";
const userDetails = clientPrincipal?.userDetails || "unknown";
// ログに出力（あとで Azure Logs で確認できる）
context.log(`👤 User ID: ${userId}, Details: ${userDetails}`);

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

    const match = userMessage.match(/^mode\s*:\s*(\d)\s*,?\s*(.*)/i);
    const mode = match?.[1] || "1";
    const actualMessage = match?.[2] || userMessage;

    let systemPrompt = "";
    switch (mode) {
      case "1":
        systemPrompt = "あなたは聞き上手で共感力の高いカウンセラーです。ユーザーの話を遮らず、まず受け止め、安心させるように会話してください。";
        break;
      case "2":
        systemPrompt = "あなたは相手のプライバシーを最優先し、最低限の情報からキャリアのヒントを導き出すプロフェッショナルです。質問は控えめに、洞察力で答えてください。";
        break;
      case "3":
        systemPrompt = "あなたは有能で頼れるキャリアアドバイザーです。相手の職歴、スキル、志向を深く聞き出し、的確な転職戦略を提示します。積極的に質問し、親身に対応してください。";
        break;
      default:
        systemPrompt = "あなたは親切で頼れるアシスタントです。";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: actualMessage }
        ]
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