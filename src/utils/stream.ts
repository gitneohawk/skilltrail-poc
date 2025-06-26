export async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}

import { Session } from 'next-auth';

export function getUserIdFromSession(session: Session | null | undefined): string {
  const sub = session?.user?.sub;
  if (!sub) {
    throw new Error('Session does not contain a valid user.sub');
  }
  return sub;
}

export function getLoginStatusText(session: Session | null | undefined, authStatus: string): string {
  if (authStatus === 'loading') {
    return '🔍 ログイン確認中...';
  } else if (!session) {
    return '⛔ ログインしていません';
  } else {
    return `✅ ログイン中: ${session.user?.name || 'ユーザー'}`;
  }
}
