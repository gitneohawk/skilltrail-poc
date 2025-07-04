import useSWR from 'swr';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import type { CandidateProfile } from '@/types/CandidateProfile';
import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { getLoginStatusText } from '@/utils/stream';
import type { SecurityQuiz } from '@/utils/quiz';

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

  const { data: profileData, error, isLoading } = useSWR<CandidateProfile | null>(
    shouldFetch ? `/api/candidate/profile` : null, // APIのURLをシンプルに
    fetcher,
    { shouldRetryOnError: false }
  );

  // --- 今日の一問 ---
  const [quiz, setQuiz] = useState<SecurityQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setQuizLoading(true);
    fetch('/api/quiz/daily')
      .then(res => res.json())
      .then(data => {
        setQuiz(data);
        setQuizLoading(false);
      })
      .catch(err => {
        setQuizError('クイズの取得に失敗しました');
        setQuizLoading(false);
      });
  }, []);

  if (status === "loading" || (shouldFetch && isLoading)) {
    return <div>Loading...</div>;
  }

   if (status !== "authenticated") {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Candidate MyPage</h1>
          <p className="mb-6 text-gray-600">
            全ての機能を利用するにはサインインが必要です。
          </p>
          <button
            onClick={() => signIn("azure-ad")}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors"
          >
            Microsoftアカウントでサインイン
          </button>
        </div>
      </Layout>
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
      const provider = 'azure'; // 固定値として設定
      const sub = session?.user?.sub || 'unknown'; // セッションから取得

      const response = await fetch(`/api/diagnosis/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sub }), // providerとsubをリクエストボディに含める
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
      console.error("診断失敗", err);
    }
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Page</h1>

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

        {/* 今日の一問 */}
        <div className="bg-yellow-50 p-6 rounded-lg shadow mb-6 border border-yellow-200">
          <h2 className="text-lg font-semibold mb-2 text-yellow-800">今日の一問（セキュリティクイズ）</h2>
          {quizLoading ? (
            <div>読み込み中...</div>
          ) : quizError ? (
            <div className="text-red-600">{quizError}</div>
          ) : quiz ? (
            <div>
              <div className="mb-2 font-bold text-gray-800">Q. {quiz.question}</div>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {quiz.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    className={`px-4 py-2 rounded border text-left transition-all ${selectedChoice === choice
                      ? (choice === quiz.answer ? 'bg-green-200 border-green-500' : 'bg-red-200 border-red-500')
                      : 'bg-white border-gray-300 hover:bg-yellow-100'}`}
                    disabled={!!selectedChoice}
                    onClick={() => {
                      setSelectedChoice(choice);
                      setShowExplanation(true);
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {showExplanation && (
                <div className="mt-4 p-4 rounded bg-gray-50 border border-gray-200">
                  <div className="font-semibold mb-1">
                    答え: <span className="text-green-700">{quiz.answer}</span>
                    {selectedChoice === quiz.answer ? (
                      <span className="ml-2 text-green-600">🎉 正解！おめでとう！</span>
                    ) : null}
                  </div>
                  <div className="mb-1">{quiz.explanation}</div>
                  {quiz.foxAdvice && <div className="italic text-orange-700">🦊 {quiz.foxAdvice}</div>}
                  {selectedChoice !== quiz.answer && (
                    <button
                      className="mt-3 px-3 py-1 bg-blue-500 text-white rounded"
                      onClick={() => { setSelectedChoice(null); setShowExplanation(false); }}
                    >
                      もう一度挑戦
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex space-x-4">
          <Link href="/candidate/profile">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={isDiagnosing}
            >
              プロフィール編集
            </button>
          </Link>
          <Link href="/candidate/skill-chat">
            <button
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              disabled={isDiagnosing}
            >
              スキルインタビューを開始
            </button>
          </Link>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            disabled={isDiagnosing}
          >
            AI診断
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            disabled={isDiagnosing}
          >
            Sign Out
          </button>
        </div>

        {/* サポート窓口セクション */}
        <div className="bg-gray-100 p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">サポート窓口</h2>
          <p className="text-gray-700 mb-4">ご質問やお問い合わせがある場合は、以下のリンクをご利用ください。</p>
          <Link href="/support">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">お問い合わせ</button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
