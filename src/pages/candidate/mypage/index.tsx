import useSWR from 'swr';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import type { CandidateProfile } from '@/types/CandidateProfile';
import Layout from '@/components/Layout';
import { useState } from 'react';
import { getDefaultProvider } from '@/utils/azureBlob';
import { getLoginStatusText } from '@/utils/stream';

export default function CandidateMyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const fetcher = async (url: string): Promise<CandidateProfile | null> => {
    try {
      const res = await axios.get<CandidateProfile>(url, {
        headers: { 'Cache-Control': 'no-cache' }
      });
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

  const shouldFetch = status === "authenticated";
  const provider = shouldFetch ? getDefaultProvider(session) : null;
  const sub = shouldFetch ? (session?.user?.sub || "unknown") : null;
  const safeSub = sub ? encodeURIComponent(sub) : null;

  const { data: profileData, error, isLoading } = useSWR<CandidateProfile | null>(
    shouldFetch && provider && safeSub
      ? `/api/candidate/profile/${provider}/${safeSub}`
      : null,
    fetcher,
    { shouldRetryOnError: false }
  );

  if (status === "loading" || (shouldFetch && isLoading)) {
    return <div>Loading...</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Candidate MyPage</h1>
        <p>{getLoginStatusText(session, status)}</p>
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
      setIsDiagnosing(true);
      const response = await fetch(`/api/diagnosis/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sub }),
      });

      if (!response.ok) {
        console.error("診断API呼び出し失敗", await response.text());
        alert("AI診断に失敗しました");
        setIsDiagnosing(false);
        return;
      }

      await response.json();
      setIsDiagnosing(false);
      router.push('/candidate/diagnosis');
    } catch (err) {
      console.error("診断処理エラー", err);
      alert("AI診断実行中にエラーが発生しました");
      setIsDiagnosing(false);
    }
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Candidate MyPage (プロフィール管理)</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">アカウント情報</h2>
          {profileData && profileData.basicInfo ? (
            <div className="mt-4">
              <p><strong>氏名:</strong> {profileData.basicInfo.fullName || "未登録"}</p>
              <p><strong>居住地:</strong> {profileData.basicInfo.address.prefecture || "未登録"}</p>
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
            className={`px-4 py-2 rounded text-white ${isDiagnosing ? 'bg-gray-400' : 'bg-green-500'}`}
            disabled={isDiagnosing}
          >
            {isDiagnosing ? '診断中...' : 'AI診断を実行'}
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
        {/* TODO: プロフィール未登録時はこのボタンを非表示にする */}
        <div className="mt-6">
          <Link href="/candidate/skill-chat">
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded"
            >
              スキルインタビューを開始
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}