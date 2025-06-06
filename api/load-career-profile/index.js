const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

module.exports = async function (context, req) {
  const userId = req.headers['x-ms-client-principal-id'];
  context.log("User ID:", userId);
  if (!userId) {
    context.res = {
      status: 400,
      body: "Missing user ID"
    };
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AzureWebJobsStorage);
  const containerClient = blobServiceClient.getContainerClient("career-profiles");

  const blobName = `${userId}-career-profile.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
    const jsonData = JSON.parse(downloaded);

    context.res = {
      status: 200,
      body: jsonData,
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    context.log.error("Failed to load career profile:", err.message);
    context.res = {
      status: 500,
      body: "Failed to load career profile"
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
