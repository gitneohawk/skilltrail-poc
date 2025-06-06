const { BlobServiceClient } = require('@azure/storage-blob');
const { streamToString } = require("../blobUtils");

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

    let mergedMessages = body.messages;

    try {
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      const existingContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
      const existingData = JSON.parse(existingContent);
      if (Array.isArray(existingData.messages)) {
        mergedMessages = existingData.messages.concat(body.messages);
      }
    } catch (err) {
      context.log("No existing blob found or failed to read it. Proceeding with new content.");
    }

    const updatedContent = JSON.stringify({
      userId: body.userId,
      sessionId: body.sessionId,
      messages: mergedMessages
    });

    await blockBlobClient.upload(updatedContent, Buffer.byteLength(updatedContent), {
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