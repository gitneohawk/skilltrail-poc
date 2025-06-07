const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  try {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      context.res = {
        status: 500,
        body: "Azure Storage connection string not found."
      };
      return;
    }

    const clientPrincipalHeader = req.headers["x-ms-client-principal"];
    if (!clientPrincipalHeader) {
      context.res = {
        status: 401,
        body: "Unauthorized"
      };
      return;
    }

    let userId = "unknown";
    try {
      const decoded = Buffer.from(clientPrincipalHeader, "base64").toString("utf8");
      const principal = JSON.parse(decoded);
      userId = principal.userId || "unknown";
    } catch (e) {
      context.res = {
        status: 400,
        body: "Invalid client principal."
      };
      return;
    }

    context.log("Extracted userId:", userId);

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");

    const blobName = `${userId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const streamToString = async (readableStream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data.toString()));
        readableStream.on("end", () => resolve(chunks.join("")));
        readableStream.on("error", reject);
      });
    };
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
    const profile = JSON.parse(downloaded);

    // Sample diagnosis logic based on profile
    let advice = "あなたのキャリア情報を確認しました。以下の点に注目すると良いでしょう：";

    if (!profile.experience || profile.experience.length === 0) {
      advice += "\n- 職歴情報が未入力のようです。経験のある職種や業界を入力すると、より具体的なアドバイスが可能です。";
    } else {
      advice += `\n- 現在の経験は「${profile.experience[0].title}」のようですね。この分野でスキルを深めるか、関連する業界に広げるとよいかもしれません。`;
    }

    context.res = {
      status: 200,
      body: { advice, profile },
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    context.log.error("Failed to generate career diagnosis:", err.message);
    context.res = {
      status: 500,
      body: "キャリア診断に失敗しました。"
    };
  }
};