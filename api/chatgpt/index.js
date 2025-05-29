const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");


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

function saveInterviewLog(userId, userMessage, aiResponse) {
  const logDir = path.join("/tmp", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const logPath = path.join(logDir, `interview-${userId}.json`);

  let log = [];
  if (fs.existsSync(logPath)) {
    try {
      log = JSON.parse(fs.readFileSync(logPath, "utf8"));
    } catch (e) {
      console.error("🧨 JSON parse error:", e);
    }
  }

  const entry = {
    timestamp: new Date().toISOString(),
    user: userMessage,
    ai: aiResponse
  };

  log.push(entry);

  try {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error("💣 Failed to write interview log:", err);
  }
}

module.exports = async function (context, req) {
  const clientPrincipal = getClientPrincipal(req);
  const userId = clientPrincipal?.userId || "anonymous";
  const userDetails = clientPrincipal?.userDetails || "unknown";

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
        systemPrompt = "あなたは聞き上手で共感力の高いカウンセラーです。...";
        break;
      case "2":
        systemPrompt = "あなたは相手のプライバシーを最優先し...";
        break;
      case "3":
        systemPrompt = "あなたは有能で頼れるキャリアアドバイザーです。...";
        break;
      case "4":
        systemPrompt = `
あなたは「Rōshi（老師）」という人格で会話する仙人です。
落ち着いた口調で、人生経験を交えて話し、相談者の話に深く耳を傾けます。
ときどき冗談や昭和っぽい語り口を挟んで、相手を和ませます。
共感をベースに、答えを出すのではなく気づきを促してください。

ルール：
- ユーザーの話にいちいち驚かない
- 「うむ」「ふぉっふぉっふぉ」などを自然に混ぜる
- たまに昔話を挟んでヨボヨボ感を出す
- 人を急かさない、否定しない
- 話を逸らしても少しだけ付き合って戻す

最初の自己紹介では、あなたが老師であることを名乗ってください。
        `.trim();
        break;
case "5":
  systemPrompt = "あなたは熟練のキャリアインタビュアーです。ユーザーの職歴、スキル、価値観、これまでの意思決定について丁寧にヒアリングし、ユーザーが自然に語れるように質問を投げかけてください。口調は親しみやすく、安心感のあるものにし、逐次メモを取るようなスタンスで会話を進めてください。";
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

    context.log("🧪 OpenAI response:", JSON.stringify(data, null, 2));

    // 👇 ログ保存処理（filePathの指定を追加）
    const record = {
      userId: userId,
      userDetails: userDetails,
      timestamp: new Date().toISOString(),
      question: actualMessage,
      response: data.choices?.[0]?.message?.content || "No response"
    };

    const logDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    const filePath = path.join(logDir, "chat-log.jsonl");

    fs.appendFileSync(filePath, JSON.stringify(record) + "\n");

    context.res = {
      status: 200,
      body: (data.choices?.[0]?.message?.content || "No response") + `\n\n(Your ID: ${userId})`,
    };

    if (mode === "5") {
  saveInterviewLog(userId, actualMessage, data.choices?.[0]?.message?.content || "No response");
}

  } catch (err) {
    context.log("Error:", err.message);
    context.res = {
      status: 500,
      body: "Internal server error",
    };
  }
};