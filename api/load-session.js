const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const clientPrincipalHeader = req.headers["x-ms-client-principal"];
  if (!clientPrincipalHeader) {
    context.res = {
      status: 401,
      body: "Unauthorized: Missing client principal."
    };
    return;
  }

  let clientPrincipal;
  try {
    const decoded = Buffer.from(clientPrincipalHeader, "base64").toString("utf8");
    clientPrincipal = JSON.parse(decoded);
  } catch (e) {
    context.res = {
      status: 400,
      body: "Invalid client principal."
    };
    return;
  }

  const userId = clientPrincipal.userId;
  if (!userId) {
    context.res = {
      status: 401,
      body: "Unauthorized: Missing user ID."
    };
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient("interviews");

  const messages = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.startsWith(userId)) {
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
      const parsed = JSON.parse(downloaded);
      messages.push(parsed);
    }
  }

  context.res = {
    status: 200,
    body: { messages }
  };
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