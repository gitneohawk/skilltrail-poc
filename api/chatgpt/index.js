const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
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

async function fetchLatestSessionForUser(userId) {
  const containerName = "interviews";
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  let latestBlob = null;
  let latestTimestamp = 0;

  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.startsWith(userId)) {
      const match = blob.name.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})_/);
      const blobTimestamp = match ? new Date(match[1].replace(/-/g, ":")) : null;
      if (blobTimestamp && blobTimestamp.getTime() > latestTimestamp) {
        latestTimestamp = blobTimestamp.getTime();
        latestBlob = blob.name;
      }
    }
  }

  if (latestBlob) {
    const blobClient = containerClient.getBlobClient(latestBlob);
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    return JSON.parse(downloaded.toString());
  } else {
    return null;
  }
}

function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

function createSessionLog(userId, mode, interviewType, userMessage, assistantReply) {
  const timestamp = new Date().toISOString();
  return {
    sessionId: uuidv4(),
    userId,
    mode,
    interviewType,
    createdAt: timestamp,
    entries: [
      { id: 1, role: "user", message: userMessage, timestamp },
      { id: 2, role: "assistant", message: assistantReply, timestamp }
    ],
    metadata: {}
  };
}

async function appendToSessionLog(userId, mode, interviewType, userMessage, assistantReply) {
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = "interviews";

  if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error("Azure Storage connection string is missing.");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // 最新のセッションファイルを探す
  let latestBlob = null;
  let latestTime = 0;
  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.startsWith(userId)) {
      const time = new Date(blob.properties.lastModified).getTime();
      if (time > latestTime) {
        latestTime = time;
        latestBlob = blob.name;
      }
    }
  }

  if (!latestBlob) {
    // セッションがないなら新規作成
    await saveToBlobStorage(userId, mode, interviewType, userMessage, assistantReply);
    return;
  }

  const blockBlobClient = containerClient.getBlockBlobClient(latestBlob);
  const downloadResponse = await blockBlobClient.download();
  const downloaded = await streamToString(downloadResponse.readableStreamBody);
  const session = JSON.parse(downloaded);

  const timestamp = new Date().toISOString();
  const lastId = session.entries.length ? session.entries[session.entries.length - 1].id : 0;

  session.entries.push({ id: lastId + 1, role: "user", message: userMessage, timestamp });
  session.entries.push({ id: lastId + 2, role: "assistant", message: assistantReply, timestamp });

  await blockBlobClient.upload(
    JSON.stringify(session, null, 2),
    Buffer.byteLength(JSON.stringify(session)),
    { overwrite: true }
  );
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

async function saveToBlobStorage(userId, mode, interviewType, userMessage, assistantReply) {
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

  const sessionLog = createSessionLog(userId, mode, interviewType, userMessage, assistantReply);
  await blockBlobClient.upload(JSON.stringify(sessionLog, null, 2), Buffer.byteLength(JSON.stringify(sessionLog)));
}

module.exports = async function (context, req) {
  const clientPrincipal = getClientPrincipal(req);
  if (!clientPrincipal) {
    context.res = {
      status: 401,
      body: "ログインしていません。"
    };
    return;
  }

  const userId = clientPrincipal.userId || "anonymous";
  const userDetails = clientPrincipal.userDetails || "unknown";
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
    let interviewType = "";
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
        systemPrompt = "あなたは仙人の老師であり…（中略）";
        break;
case "5":
  systemPrompt = `
あなたは熟練のキャリアカウンセラーであり、人生相談の仙人「老師」という人格で振る舞います。
今から、ユーザーの職務経歴について丁寧にヒアリングしてください。

--- ルール ---
- 一度に複数の質問はせず、1つずつ聞いてください。
- なるべくユーザーの言葉を引き出すようにしてください。
- 「その経験から学んだことは何ですか？」「当時、どんな工夫をしましたか？」などの掘り下げ質問も交えてください。
- 回答をもとに次の質問を柔軟に出してください。
- 突然アドバイスや分析はせず、ユーザーの話をよく聞きましょう。
- 老師らしい柔らかい語り口調で、質問ごとに一言コメントを添えてください。

まずは、これまでの職歴の概要について質問してください。
  `.trim();
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

    if (mode === "5") {
      await appendToSessionLog(userId, mode, interviewType, actualMessage, reply);
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