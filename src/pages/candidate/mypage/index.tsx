import useSWR from 'swr';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import type { CandidateProfile } from '@/types/candidate-profile';

export default function CandidateMyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const provider = "azure";  // 固定で進行
  const sub = session?.user?.sub || "unknown";
  const safeSub = encodeURIComponent(sub);
const fetcher = async (url: string): Promise<CandidateProfile | null> => {
  try {
    const res = await axios.get<CandidateProfile>(url);
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      // 新規ユーザなどプロフィール未登録の場合は null 扱いにする
      return null;
    }
    console.error("プロフィール取得失敗", err);
    throw err;
  }
};
const { data: profileData, error, isLoading } = useSWR<CandidateProfile | null>(
  session ? `/api/candidate/profile/${provider}/${safeSub}` : null,
  fetcher,
  { shouldRetryOnError: false }
);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Candidate MyPage (ログインしてください)</h1>
        <p>サインインしてご利用ください。</p>
        <button
          onClick={() => signIn("azure-ad")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          サインイン
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (profileData === null) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Candidate MyPage</h1>
        <p>プロフィールが未登録です。以下からプロフィール登録をお願いします。</p>
        <Link href="/candidate/profile">
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            プロフィール登録
          </button>
        </Link>
      </div>
    );
  }

  async function handleDiagnosis() {
    try {
      const response = await fetch(`/api/diagnosis/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sub }),
      });

      if (!response.ok) {
        console.error("診断API呼び出し失敗", await response.text());
        alert("AI診断に失敗しました");
        return;
      }

      const result = await response.json();
      console.log("診断結果:", result);
      alert(`診断が完了しました。\n\n要約: ${result.summary}`);
    } catch (err) {
      console.error("診断処理エラー", err);
      alert("AI診断実行中にエラーが発生しました");
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Candidate MyPage (プロフィール管理)</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">アカウント情報</h2>
        {profileData && profileData.basicInfo ? (
          <div className="mt-4">
            <p><strong>氏名:</strong> {profileData.basicInfo.fullName || "未登録"}</p>
            <p><strong>居住地:</strong> {profileData.basicInfo.residence || "未登録"}</p>
            <p><strong>希望勤務地:</strong> {profileData.basicInfo.workLocationPreferences?.join(", ") || "未登録"}</p>
          </div>
        ) : (
          <p>基本プロフィール情報が未登録です。</p>
        )}
        <p><strong>氏名 (アカウント):</strong> {session?.user?.name || "Unknown User"}</p>
        <p><strong>メールアドレス:</strong> {session?.user?.email}</p>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleDiagnosis}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          AI診断を実行
        </button>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Sign Out
        </button>

        <Link href="/candidate/profile">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            プロフィール編集
          </button>
        </Link>
      </div>
    </div>
  );
}