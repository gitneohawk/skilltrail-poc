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

    const userId = req.query.userId;
    context.log("Query userId:", userId);
    if (!userId) {
      context.res = {
        status: 400,
        body: "Missing userId in query parameters."
      };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");

    const blobName = `${userId}.json`;
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

      context.res = {
        status: 200,
        body: existingProfile,
        headers: { "Content-Type": "application/json" }
      };
    } catch (err) {
      context.log.error("No career profile found or failed to read profile:", err.message);
      context.res = {
        status: 404,
        body: "Career profile not found."
      };
    }
  } catch (error) {
    context.log.error("Error loading career profile:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error."
    };
  }
};