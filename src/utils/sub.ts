// utils/sub.ts
import type { Session } from "next-auth";

/**
 * セッションからユーザの `sub` を取得します。取得できない場合は "unknown" を返します。
 */
export function getUserSub(session?: Session | null): string {
  return session?.user?.sub || "unknown";
}

/**
 * `sub` を URL に安全に使えるようエンコードして返します。
 */
export function getSafeSub(session?: Session | null): string {
  return encodeURIComponent(getUserSub(session));
}

/**
 * Microsoft/Googleなど複数プロバイダに対応する場合に、セッションのemailから推定。
 * 現時点では "azure" をデフォルトとして返します。
 */
export function getDefaultProvider(session?: Session | null): string {
  return 'azure'; // 固定値に変更
}
