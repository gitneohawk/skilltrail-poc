// src/lib/apiClient.ts

import { signOut } from 'next-auth/react';

/**
 * アプリケーション内で使用する共通のAPIクライアント関数。
 * fetchをラップし、特に401 Unauthorizedエラーをグローバルに処理する。
 * @param url リクエスト先のURL
 * @param options fetchに渡すオプション (method, bodyなど)
 * @returns fetchのレスポンスからJSONをパースした結果
 */
export const apiClient = async (url: string, options?: RequestInit) => {
  // 通常通りfetchを実行
  const response = await fetch(url, options);

  // ★★★ ここがこの関数の心臓部 ★★★
  // APIが401エラー（未認証）を返した場合の処理
  if (response.status === 401) {
    // next-authのセッション情報をクライアント側でクリアする
    // redirect: false で、signOutがページリロードを引き起こすのを防ぐ
    await signOut({ redirect: false });

    // ユーザーをログインページに強制的にリダイレクトさせる
    // これにより、セッション切れの際は必ずログイン画面に戻る挙動が保証される
    window.location.href = '/api/auth/signin';

    // これ以上の処理を中断するために、エラーをスローする
    // このエラーは呼び出し元のcatchブロックでは通常キャッチされない（リダイレクトが先に行われるため）
    throw new Error('セッションが切れました。再度ログインしてください。');
  }

  // 401以外のエラー（400, 404, 500など）の処理
  if (!response.ok) {
    // エラーレスポンスのボディにJSONでエラーメッセージが含まれていることを期待する
    // もしJSONでなければ、汎用的なエラーメッセージを生成する
    const errorData = await response.json().catch(() => ({ error: '不明なエラーが発生しました。' }));
    throw new Error(errorData.error || 'APIリクエストに失敗しました。');
  }

  // 204 No Content のように、成功したがレスポンスボディが空の場合を考慮する
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json(); // JSONのボディがあればパースして返す
  }

  // ボディが空の場合は何も返さない (例: DELETEリクエストの成功時など)
  return;
};
