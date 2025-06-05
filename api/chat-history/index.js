const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  const userId = req.headers['x-ms-client-principal-id'] || 'anonymous';
  const data = req.body;

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient('chat-sessions');

    // Ensure the container exists
    await containerClient.createIfNotExists({ access: 'container' });

    const blockBlobClient = containerClient.getBlockBlobClient(`${userId}.json`);

    const json = JSON.stringify(data.entries);
    await blockBlobClient.upload(json, Buffer.byteLength(json), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });

    context.res = {
      status: 200,
      body: { success: true }
    };
  } catch (err) {
    context.log.error('Error saving chat history:', err.message);
    context.res = {
      status: 500,
      body: { success: false, error: err.message }
    };
  }
};