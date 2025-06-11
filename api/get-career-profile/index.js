const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const userId = req.query.userId;
  if (!userId) {
    context.res = { status: 400, body: "userId is required" };
    return;
  }

  const containerName = "career-profiles";
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  try {
    const blobClient = containerClient.getBlobClient(`${userId}.json`);
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    const profile = JSON.parse(downloaded.toString());
    context.res = { status: 200, body: profile };
  } catch (err) {
    // プロファイルが存在しない場合は空オブジェクトを返す
    context.res = { status: 200, body: {} };
  }
};

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