const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const path = require("path");

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

async function saveToBlobStorage(userId, userMessage, assistantReply) {
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = "interviews";

  if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error("Azure Storage connection string is missing.");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const timestamp = new Date().toISOString();
  const fileName = `${userId}_${timestamp}_${uuidv4()}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

const clientPrincipal = getClientPrincipal(req);
if (!clientPrincipal) {
  context.res = {
    status: 401,
    body: "ログインしていません。"
  };
  return;
}

  const data = {
    timestamp,
    userId,
    userMessage,
    assistantReply
  };

  await blockBlobClient.upload(JSON.stringify(data, null, 2), Buffer.byteLength(JSON.stringify(data)));
}

module.exports = async function (context, req) {
  const clientPrincipal = getClientPrincipal(req);
  const userId = clientPrincipal?.userId || "anonymous";
  const userDetails = clientPrincipal?.userDetails || "unknown";

  context.log(`👤 User ID: ${userId}, Details: ${userDetails}`);

  try {
    const userMessage = req.body?.message;
    if (!userMessage) {
      context.res = { status: 400, body: "Missing 'message' in request body." };
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      context.res = { status: 500, body: "Missing OpenAI API key." };
      return;
    }

    const match = userMessage.match(/^mode\s*:\s*(\d)\s*,?\s*(.*)/i);
    const mode = match?.[1] || "1";
    const actualMessage = match?.[2] || userMessage;

    let systemPrompt = "";
    switch (mode) {
      case "4":
        systemPrompt = "あなたは仙人の老師であり…（中略）";
        break;
      case "5":
        systemPrompt = "あなたは熟練の人生相談仙人『老師』です。…";
        break;
      case "1":
      case "2":
      case "3":
        systemPrompt = "（それぞれのカウンセラー設定）";
        break;
      default:
        systemPrompt = "あなたは親切で頼れるアシスタントです。";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
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
    const reply = data.choices?.[0]?.message?.content || "No response";

    // ✍️ Blob保存（mode 5 のときのみ）
    if (mode === "5") {
      await saveToBlobStorage(userId, actualMessage, reply);
      context.log(`📝 Interview saved to Blob for ${userId}`);
    }

    context.res = {
      status: 200,
      body: reply + `\n\n(Your ID: ${userId})`,
    };
  } catch (err) {
    context.log("💥 Error:", err.message);
    context.res = {
      status: 500,
      body: "Internal server error",
    };
  }
};