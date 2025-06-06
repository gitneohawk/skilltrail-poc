const { BlobServiceClient } = require("@azure/storage-blob");

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

    const body = req.body;
    if (!body || !body.userId || !body.profile) {
      context.res = {
        status: 400,
        body: "Missing userId or profile in request body."
      };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");
    await containerClient.createIfNotExists();

    const blobName = `${body.userId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    let existingProfile = {};
    try {
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
      existingProfile = JSON.parse(downloaded);
    } catch (err) {
      context.log(`No existing profile found. Creating new profile for userId: ${body.userId}`);
    }

    const mergedProfile = { ...existingProfile, ...body.profile };
    const content = JSON.stringify(mergedProfile);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: "application/json" },
      overwrite: true
    });

    context.res = {
      status: 200,
      body: "Career profile updated successfully."
    };
  } catch (error) {
    context.log.error("Error updating career profile:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error."
    };
  }
};