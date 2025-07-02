import { BlobServiceClient } from '@azure/storage-blob';

export type SecurityQuiz = {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  category: string;
  difficulty: string;
  foxAdvice?: string;
};

// Azure Blobから全問取得
export async function fetchAllQuizzesFromBlob(): Promise<SecurityQuiz[]> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient('security-quiz');
  const blobClient = containerClient.getBlobClient('20250630-quiz.json');
  const downloadBlockBlobResponse = await blobClient.download();
  const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody ?? null);
  const quizzes = JSON.parse(downloaded);
  // choicesがstringの場合は配列に変換
  return quizzes.map((q: any) => ({ ...q, choices: Array.isArray(q.choices) ? q.choices : JSON.parse(q.choices) }));
}

// 日付で固定 or ランダムで1問返す
export async function getDailyQuiz(): Promise<SecurityQuiz> {
  const all = await fetchAllQuizzesFromBlob();
  // 日付で固定: 例としてYYYYMMDDを数値化してインデックスに
  const today = new Date();
  const ymd = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = ymd % all.length;
  return all[idx];
}

// Blobストリーム→文字列
async function streamToString(readableStream: NodeJS.ReadableStream | null): Promise<string> {
  if (!readableStream) return '';
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}
