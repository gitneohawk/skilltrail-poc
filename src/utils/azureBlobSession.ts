


import { BlobServiceClient } from '@azure/storage-blob';
import { streamToString } from './stream';

const containerName = 'career-interviews';

function getSessionBlobName(userId: string, mode: string, interviewType: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `${userId}_${mode}_${interviewType}_${timestamp}.json`;
}

export async function appendToSessionLog(
  userId: string,
  mode: string,
  interviewType: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists();

  const blobName = getSessionBlobName(userId, mode, interviewType);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const session = {
    timestamp: new Date().toISOString(),
    mode,
    interviewType,
    messages: [
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantReply }
    ]
  };

  const json = JSON.stringify(session, null, 2);
  await blockBlobClient.upload(json, json.length, {
    blobHTTPHeaders: { blobContentType: 'application/json' }
  });
}