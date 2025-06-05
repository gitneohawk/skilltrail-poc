const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  try {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      context.log.error("Azure Storage connection string not found.");
      context.res = {
        status: 500,
        body: "Storage connection string missing."
      };
      return;
    }

    const body = req.body;
    if (!body || !body.userId || !body.sessionId || !body.messages) {
      context.res = {
        status: 400,
        body: "Missing userId, sessionId, or messages in request body."
      };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerName = "chat-sessions";
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const userId = body.userId || "unknown";
    const blobName = `${userId}-${body.sessionId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const content = JSON.stringify(body);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });

    context.res = {
      status: 200,
      body: "Session saved successfully."
    };
  } catch (error) {
    context.log.error("Error saving session:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error."
    };
  }
};