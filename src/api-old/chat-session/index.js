const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    context.res = {
      status: 500,
      body: "Storage connection string missing."
    };
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient("chat-sessions");
  await containerClient.createIfNotExists();

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

  const sessionId = "default";
  const blobName = `${userId}-${sessionId}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  if (req.method === "GET") {
    try {
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
      const parsed = JSON.parse(downloaded);
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      context.res = {
        status: 200,
        body: { messages }
      };
    } catch (e) {
      context.res = {
        status: 200,
        body: { messages: [] }
      };
    }
  } else if (req.method === "POST") {
    const { role, message } = req.body || {};
    if (!role || !message) {
      context.res = {
        status: 400,
        body: "Missing role or message"
      };
      return;
    }

    let existingMessages = [];
    try {
      const download = await blockBlobClient.download(0);
      const text = await streamToString(download.readableStreamBody);
      const parsed = JSON.parse(text);
      existingMessages = parsed.messages || [];
    } catch (_) {
      // 初回作成時は空
    }

    const updated = {
      userId,
      sessionId,
      messages: [...existingMessages, { role, message }]
    };

    const content = JSON.stringify(updated);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: "application/json" },
      overwrite: true
    });

    context.res = {
      status: 200,
      body: "Appended"
    };
  } else {
    context.res = {
      status: 405,
      body: "Method Not Allowed"
    };
  }
};

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}