import { BlobServiceClient } from '@azure/storage-blob';
import { streamToString, getUserIdFromSession } from './stream';
import { Session } from 'next-auth';

/**
 * プロバイダ名とユーザIDを繋いだblob名でJSONを保存
 */
export async function saveJsonToBlobWithProvider(
  containerName: string,
  provider: string,
  userId: string,
  data: unknown
) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blobName = `${provider}-${userId}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const json = JSON.stringify(data, null, 2);
  await blockBlobClient.upload(json, Buffer.byteLength(json), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

/**
 * コンテナ内のプロファイルJSONのblob名一覧を取得
 */
export async function listProfileBlobNames(containerName: string): Promise<string[]> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const blobNames: string[] = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.endsWith('.json')) {
      blobNames.push(blob.name);
    }
  }

  return blobNames;
}

export async function uploadJsonToBlob(
  containerName: string,
  session: Session,
  data: unknown
) {
  const provider = 'azure'; // getDefaultProviderを削除し、固定値に変更
  const userId = getUserIdFromSession(session);
  return saveJsonToBlobWithProvider(containerName, provider, userId, data);
}

export async function downloadJsonFromBlob<T>(
  containerName: string,
  session: Session
): Promise<T | null> {
  const provider = getDefaultProvider(session);
  const userId = getUserIdFromSession(session);
  return loadJsonFromBlobWithProvider<T>(containerName, provider, userId);
}

export function getDefaultProvider(session?: Session | null): string {
  // 例: 将来 Google Workspace サポート時に切替
  if (session?.user?.email?.endsWith('@google.com')) {
    return 'google';
  }
  return 'azure';
}

/**
 * プロバイダ名とユーザIDを繋いだblob名でJSONを取得
 */
export async function loadJsonFromBlobWithProvider<T>(
  containerName: string,
  provider: string,
  userId: string
): Promise<T | null> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `${provider}-${userId}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody!);
    return JSON.parse(downloaded) as T;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 指定したBlobにJSON配列として追記保存する（存在しなければ新規作成）
 */
export async function appendToJsonArrayBlob(
  containerName: string,
  blobName: string,
  newEntry: unknown
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await containerClient.createIfNotExists();

  let currentContent: unknown[] = [];

  try {
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody!);
    currentContent = JSON.parse(downloaded);
    if (!Array.isArray(currentContent)) {
      currentContent = [];
    }
  } catch (error: any) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  currentContent.push(newEntry);
  const updatedJson = JSON.stringify(currentContent, null, 2);
  await blockBlobClient.upload(updatedJson, Buffer.byteLength(updatedJson), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

/**
 * skill-interviews コンテナにユーザー別のチャットログを保存
 */
export async function saveSkillChatToBlob(
  containerName: string,
  provider: string,
  userId: string,
  data: unknown
) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blobName = `${provider}-${userId}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const json = JSON.stringify(data, null, 2);
  await blockBlobClient.upload(json, Buffer.byteLength(json), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

/**
 * skill-interviews コンテナからユーザー別のチャットログを読み込み
 */
export async function loadSkillChatFromBlob<T>(
  containerName: string,
  provider: string,
  userId: string
): Promise<T | null> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `${provider}-${userId}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody!);
    return JSON.parse(downloaded) as T;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

// 環境変数 AZURE_STORAGE_CONNECTION_STRING の設定確認
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.error('AZURE_STORAGE_CONNECTION_STRING is not configured. Please check your environment variables.');
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured.');
} else {
    console.log('AZURE_STORAGE_CONNECTION_STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING);
}
/**
 * 指定したBlobにテキストデータを保存する
 */
export async function saveTextToBlob(
  containerName: string,
  blobName: string,
  text: string
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // テキストをUTF-8のBufferに変換してアップロード
  await blockBlobClient.upload(text, Buffer.byteLength(text));
}


/**
 * 指定したユーザーの学習計画詳細Blobをすべて削除する
 * @param containerName コンテナ名
 * @param userId ユーザーID (sub)
 */
export async function deleteUserLearningPlanDetails(
  containerName: string,
  userId: string
): Promise<void> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // コンテナが存在しない場合は、何もしない
  const containerExists = await containerClient.exists();
  if (!containerExists) {
    console.log(`Container ${containerName} does not exist. Skipping deletion.`);
    return;
  }

  // ユーザーIDをプレフィックスとして、関連するBlobをリストアップ
  for await (const blob of containerClient.listBlobsFlat({ prefix: `${userId}/` })) {
    await containerClient.deleteBlob(blob.name);
    console.log(`Deleted blob: ${blob.name}`);
  }
}

