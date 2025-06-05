const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  const userId = req.headers['x-ms-client-principal-id'] || 'anonymous';
  context.log('Step 0: Function invoked. User ID:', userId);
  const data = req.body;

  try {
    context.log('Step 1: Initializing BlobServiceClient');
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

    context.log('Step 2: Getting container client');
    const containerClient = blobServiceClient.getContainerClient('chat-sessions');

    context.log('Step 3: Creating container if not exists');
    await containerClient.createIfNotExists({ access: 'container' });

    context.log('Step 4: Getting block blob client');
    const blockBlobClient = containerClient.getBlockBlobClient(`${userId}.json`);

    context.log('Step 5: Logging request body');
    context.log('Incoming data:', JSON.stringify(data));
    context.log('Parsed entries:', JSON.stringify(data?.entries));

    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const json = JSON.stringify(entries);

    context.log('Step 6: Uploading to blob');
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