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
import {
  UserCircleIcon, PencilSquareIcon, ChatBubbleLeftRightIcon,
  SparklesIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'; // アイコンをインポート

export default function CandidateMyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

// ▼▼▼ この関数全体を置き換えてください ▼▼▼
  function handleDiagnosis() {
    // 診断ページに遷移するだけ。
    // データの取得とストリーミングは診断ページ側で行います。
    setIsDiagnosing(true); // ユーザーにフィードバックするためローディング状態はオンにする
    router.push('/candidate/diagnosis');
  }
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

 return (
    <Layout>
      <div className="flex">
        {/* --- サイドバー --- */}
        <aside className="hidden md:block w-64 flex-shrink-0 p-6 bg-white border-r border-slate-200">
          <div className="flex items-center gap-3 mb-8">
            <UserCircleIcon className="h-12 w-12 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-800">{session?.user?.name || "Unknown User"}</p>
              <p className="text-sm text-slate-500">{session?.user?.email}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/candidate/profile" className="flex items-center gap-3 px-3 py-2 text-slate-700 rounded-md hover:bg-slate-100">
              <PencilSquareIcon className="h-5 w-5 text-slate-500" />
              プロフィール編集
            </Link>
            <Link href="/candidate/skill-chat" className="flex items-center gap-3 px-3 py-2 text-slate-700 rounded-md hover:bg-slate-100">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-500" />
              スキルインタビュー
            </Link>
            <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 text-red-600 rounded-md hover:bg-red-50 mt-8">
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              サインアウト
            </button>
          </nav>
        </aside>

        {/* --- モバイル用サイドバー --- */}
        <aside className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <nav className="flex justify-around">
            <Link href="/candidate/profile" className="flex flex-col items-center text-slate-700">
              <PencilSquareIcon className="h-6 w-6 text-slate-500" />
              <span className="text-xs">プロフィール</span>
            </Link>
            <Link href="/candidate/skill-chat" className="flex flex-col items-center text-slate-700">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-slate-500" />
              <span className="text-xs">スキル</span>
            </Link>
            <button onClick={() => signOut()} className="flex flex-col items-center text-red-600">
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
              <span className="text-xs">サインアウト</span>
            </button>
          </nav>
        </aside>

        {/* --- ハンバーガーメニュー --- */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-slate-700 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5"
              />
            </svg>
          </button>
          <p className="text-slate-800 font-semibold">MyPage</p>
        </div>

        {/* --- モバイル用スライドインメニュー --- */}
        <aside
          className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 p-6 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 text-slate-700 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <nav className="flex flex-col gap-4">
            <Link href="/candidate/profile" className="text-slate-700">
              プロフィール編集
            </Link>
            <Link href="/candidate/skill-chat" className="text-slate-700">
              スキルインタビュー
            </Link>
            <button onClick={() => signOut()} className="text-red-600">
              サインアウト
            </button>
          </nav>
        </aside>

{/* --- メインコンテンツ --- */}
<main className="flex-1 p-8">
  <h1 className="text-3xl font-bold text-slate-800 mb-8">
    こんにちは、<br />{session?.user?.name?.split(' ')[0] || 'ゲスト'}さん
  </h1>

  {/* ▼▼▼ この部分のレイアウトを変更 ▼▼▼ */}
  <div className="flex flex-col gap-8">

    {/* AI診断カード */}
    <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <div className="flex-1">
        <SparklesIcon className="h-8 w-8 mb-4 opacity-70" />
        <h2 className="text-2xl font-bold mb-2">AIスキル診断</h2>
        <p className="opacity-90">あなたのスキルをAIが分析し、キャリアパスや学習プランを提案します。</p>
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={handleDiagnosis}
          className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors w-full sm:w-auto"
          disabled={isDiagnosing}
        >
          {isDiagnosing ? '診断中...' : '今すぐ診断する'}
        </button>
      </div>
    </div>

    {/* 今日の一問カード */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <h2 className="text-lg font-semibold mb-4 text-slate-800">今日の一問</h2>
      {quizLoading ? (
        <div className="text-slate-500">読み込み中...</div>
      ) : quizError ? (
        <div className="text-red-500">{quizError}</div>
      ) : quiz ? (
        <div>
          <p className="font-semibold text-slate-700 mb-4">Q. {quiz.question}</p>

          <div className="space-y-2 mb-4">
            {quiz.choices.map((choice, idx) => (
              <button
                key={idx}
                className={`w-full px-4 py-2 rounded-lg border text-left transition-all text-sm
                  ${selectedChoice
                    ? (choice === quiz.answer
                        ? 'bg-green-100 border-green-400 text-green-800 font-semibold'
                        : (selectedChoice === choice ? 'bg-red-100 border-red-400 text-red-800' : 'bg-slate-50 text-slate-500 border-slate-200'))
                    : 'bg-white border-slate-300 hover:bg-slate-50'
                  }`}
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
            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <div className="font-semibold mb-2">
                {selectedChoice === quiz.answer ? (
                  <span className="text-green-600">🎉 正解！</span>
                ) : (
                  <span className="text-red-600">不正解...</span>
                )}
                <span className="ml-2 text-slate-800">答え: {quiz.answer}</span>
              </div>
              <p className="text-slate-600 mb-2">{quiz.explanation}</p>
              {quiz.foxAdvice && <p className="italic text-orange-700">🦊 {quiz.foxAdvice}</p>}

              {selectedChoice !== quiz.answer && (
                <button
                  className="mt-3 px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600"
                  onClick={() => { setSelectedChoice(null); setShowExplanation(false); }}
                >
                  もう一度挑戦
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-500">今日のクイズはありません。</div>
      )}
    </div>

    {/* アカウント情報カード */}
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <h2 className="text-lg font-semibold mb-2 text-slate-800">アカウント情報詳細</h2>
      {profileData && profileData.basicInfo ? (
        <div className="mt-4 text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-4">
          <p><strong>氏名:</strong> {profileData.basicInfo.fullName || "未登録"}</p>
          <p><strong>居住地:</strong> {profileData.basicInfo.address.prefecture || "未登録"}</p>
          <p><strong>希望勤務地:</strong> {profileData.basicInfo.workLocationPreferences?.join(", ") || "未登録"}</p>
        </div>
      ) : (
        <p>基本プロフィール情報が未登録です。</p>
      )}
    </div>

    <div className="text-center mt-8">
      <Link href="/candidate">
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          トップに戻る
        </button>
      </Link>
    </div>

  </div>
  {/* ▲▲▲ この部分のレイアウトを変更 ▲▲▲ */}
</main>
      </div>
    </Layout>
  );
}
