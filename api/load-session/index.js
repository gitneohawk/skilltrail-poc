const { BlobServiceClient } = require("@azure/storage-blob");
const { streamToString } = require("../../shared/blobUtils.js");

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
  const sessionId = req.query.sessionId || "default";
  const blobName = `${userId}-${sessionId}.json`;

  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    context.log.error("Azure Storage connection string not found.");
    context.res = {
      status: 500,
      body: "Storage connection string missing."
    };
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient("chat-sessions");
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
    const parsed = JSON.parse(downloaded);
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
    context.res = {
      status: 200,
      body: { messages }
    };
  } catch (err) {
    context.log.warn(`Could not load session data for blob ${blobName}:`, err.message);
    context.res = {
      status: 200,
      body: { messages: [] }
    };
  }
};