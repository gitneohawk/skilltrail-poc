const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const userId = req.headers["x-ms-client-principal-id"];
  if (!userId) {
    context.res = {
      status: 401,
      body: "Unauthorized"
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