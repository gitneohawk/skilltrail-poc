import useSWR, { useSWRConfig } from 'swr';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import type { CandidateProfile } from '@/types/CandidateProfile';
import type { RoadmapStep } from '@/types/learning-plan';
import Layout from '@/components/Layout';
import { useEffect, useState, FC } from 'react';
import type { SecurityQuiz } from '@/utils/quiz';
import {
  UserCircleIcon, PencilSquareIcon, ChatBubbleLeftRightIcon,
  SparklesIcon, ArrowRightOnRectangleIcon, CheckCircleIcon
} from '@heroicons/react/24/solid';

// --- ヘルパーコンポーネント ---
const LearningPlanCard: FC<{ step: RoadmapStep; onStatusChange: (stage: number, newStatus: RoadmapStep['status']) => void; }> = ({ step, onStatusChange }) => {
  const isCompleted = step.status === 'completed';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Link href={`/candidate/learning/${step.stage}`} passHref legacyBehavior>
      <a className={`block p-6 rounded-2xl border transition-all cursor-pointer ${isCompleted ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'}`}>
        <div className="flex items-start gap-4">
          <div onClick={handleCheckboxClick} className="flex items-center h-full pt-1">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={isCompleted}
              onChange={(e) => onStatusChange(step.stage, e.target.checked ? 'completed' : 'todo')}
            />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-slate-800 ${isCompleted ? 'line-through text-slate-500' : ''}`}>{step.stage}. {step.title}</h3>
            <div className={`mt-2 text-sm text-slate-600 space-y-2 ${isCompleted ? 'opacity-60' : ''}`}>
              <p><strong>習得スキル:</strong> {(step.skills || []).join(', ')}</p>
            </div>
          </div>
          {isCompleted && <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />}
        </div>
      </a>
    </Link>
  );
};


// --- メインコンポーネント ---
export default function CandidateMyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // --- データ取得 ---
  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const { data: profileData, isLoading: isProfileLoading } = useSWR<CandidateProfile | null>(
    status === "authenticated" ? `/api/candidate/profile` : null,
    fetcher
  );

  // ▼▼▼【ここが追加された部分 1/3】▼▼▼
  const { data: roadmap, error: roadmapError } = useSWR<RoadmapStep[]>(
    status === "authenticated" ? `/api/candidate/learning-plan` : null,
    fetcher
  );
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // --- 今日の一問のロジック ---
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


  // --- イベントハンドラ ---
  const handleDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      // 1. 既存の学習計画があるか、APIを呼び出して確認
      const existingPlanRes = await fetch('/api/candidate/learning-plan');

      // 2. 計画が存在する場合 (200 OK)
      if (existingPlanRes.ok) {
        const confirmed = window.confirm(
          "既存の学習計画があります。新しい診断を実行すると、計画が更新され、進捗がリセットされる可能性があります。続行しますか？"
        );

        // 3. ユーザーがキャンセルした場合、処理を中断
        if (!confirmed) {
          setIsDiagnosing(false); // ローディング状態を解除
          return;
        }

        // 4. ユーザーがOKを押したら、まず古い詳細データを削除するAPIを呼び出す
        const deleteRes = await fetch('/api/candidate/delete-details', {
          method: 'DELETE',
        });

        if (!deleteRes.ok) {
          // 削除に失敗しても、ユーザーに通知した上で診断は続行させる
          alert('古い学習計画のクリアに失敗しましたが、新しい診断を続行します。');
        }
      }

      // 5. 計画がない場合、またはユーザーが確認した場合は診断ページへ
      router.push('/candidate/diagnosis');

    } catch (error) {
      // API呼び出し自体でエラーが起きた場合
      console.error("Error during pre-diagnosis check:", error);
      const confirmed = window.confirm("事前チェック中にエラーが発生しましたが、診断を続行しますか？");
      if (confirmed) {
        router.push('/candidate/diagnosis');
      } else {
        setIsDiagnosing(false);
      }
    }
    // ページ遷移する場合は、ここでローディングを解除する必要はありません
  };

  // ▼▼▼【ここが追加された部分 2/3】▼▼▼
  const handleStatusChange = async (stage: number, newStatus: RoadmapStep['status']) => {
    if (!roadmap) return;

    const originalRoadmap = [...roadmap];
    const newRoadmap = roadmap.map(step =>
      step.stage === stage ? { ...step, status: newStatus } : step
    );
    mutate('/api/candidate/learning-plan', newRoadmap, false);

    try {
      await fetch('/api/candidate/learning-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, status: newStatus }),
      });
      mutate('/api/candidate/learning-plan');
    } catch (error) {
      console.error("Failed to update status:", error);
      mutate('/api/candidate/learning-plan', originalRoadmap, false);
      alert('進捗の更新に失敗しました。');
    }
  };
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


  // --- レンダリングロジック ---
  if (status === 'loading' || (status === 'authenticated' && isProfileLoading)) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (status !== 'authenticated') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Candidate MyPage</h1>
          <p className="mb-6 text-gray-600">全ての機能を利用するにはサインインが必要です。</p>
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

  if (profileData === null) {
    return (
      <Layout>
        <div className="p-6">
          <h1 className="text-xl font-bold mb-4">Candidate MyPage</h1>
          <p>プロフィールが未登録です。以下からプロフィール登録をお願いします。</p>
          <Link href="/candidate/profile">
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
              プロフィール登録
            </button>
          </Link>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="flex min-h-screen">
        {/* --- サイドバー (PC) --- */}
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

        {/* --- メインコンテンツ --- */}
        <main className="flex-1 p-8 pb-24 md:pb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">
            こんにちは、{session?.user?.name?.split(' ')[0] || 'ゲスト'}さん
          </h1>

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
                  {isDiagnosing ? '処理中...' : '今すぐ診断する'}
                </button>
              </div>
            </div>

            {/* ▼▼▼【ここが追加された部分 3/3】▼▼▼ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">あなたの学習計画</h2>
              {roadmap && roadmap.length > 0 ? (
                <div className="space-y-4">
                  {roadmap.map(step => (
                    <LearningPlanCard key={step.stage} step={step} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              ) : roadmapError ? (
                <p className="text-slate-500">学習計画はまだありません。AI診断を実行して作成しましょう！</p>
              ) : (
                <p className="text-slate-500">学習計画を読み込んでいます...</p>
              )}
            </div>
            {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

            {/* 今日の一問カード */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">今日の一問</h2>
              {quizLoading ? (
                <div className="text-slate-500">読み込み中...</div>
              ) : quizError ? (
                <div className="text-red-600">{quizError}</div>
              ) : quiz ? (
                <div>
                  <p className="font-semibold text-slate-700 mb-4">Q. {quiz.question}</p>
                  <div className="space-y-2 mb-4">
                    {quiz.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        className={`w-full px-4 py-2 rounded-lg border text-left transition-all text-sm ${selectedChoice ? (choice === quiz.answer ? 'bg-green-100 border-green-400 text-green-800 font-semibold' : (selectedChoice === choice ? 'bg-red-100 border-red-400 text-red-800' : 'bg-slate-50 text-slate-500 border-slate-200')) : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                        disabled={!!selectedChoice}
                        onClick={() => { setSelectedChoice(choice); setShowExplanation(true); }}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  {showExplanation && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                      <div className="font-semibold mb-2">
                        {selectedChoice === quiz.answer ? (<span className="text-green-600">🎉 正解！</span>) : (<span className="text-red-600">不正解...</span>)}
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
                  <p><strong>希望勤務地:</strong> {(profileData.basicInfo.workLocationPreferences || []).join(", ") || "未登録"}</p>
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
        </main>
      </div>
    </Layout>
  );
}
