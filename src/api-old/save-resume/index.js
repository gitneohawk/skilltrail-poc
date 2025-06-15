const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  const userId = req.body?.userId;
  const resumeData = req.body?.resume;

  if (!userId || !resumeData) {
    context.res = {
      status: 400,
      body: "Missing userId or resume data",
    };
    return;
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");

    const blobName = `${userId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    let existingData = {};
    try {
      const downloadBlockBlobResponse = await blockBlobClient.download();
      const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
      existingData = JSON.parse(downloaded.toString());
    } catch (err) {
      context.log.warn("No existing blob or failed to read it, will create new:", err.message);
    }

    existingData.resume = resumeData;
    const data = JSON.stringify(existingData, null, 2);
    await blockBlobClient.upload(data, Buffer.byteLength(data), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });

    context.res = {
      status: 200,
      body: "Resume saved successfully"
    };
  } catch (err) {
    context.log.error("Error saving resume:", err.message);
    context.res = {
      status: 500,
      body: "Failed to save resume"
    };
  }
};

async function streamToBuffer(readableStream) {
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