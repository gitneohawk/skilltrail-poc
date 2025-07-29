// pages/talent/mypage.tsx

import { useEffect, useState, FC } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import Layout from '@/components/Layout';
import type { Job, Company, Application, TalentProfile, AnalysisResult, LearningRoadmapStep } from '@prisma/client';
import { format } from 'date-fns';
import { Spinner } from '@/components/Spinner';
import {
  UserCircleIcon,
  PencilSquareIcon,
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/apiClient';

// ... (他の型定義やコンポーネントはそのまま) ...
type ApplicationWithJob = Application & {
  job: Job & {
    company: { name: string; logoUrl: string | null };
  };
};

// APIから受け取る企業の型定義
type CompanyForList = {
  corporateNumber: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  industry: string | null;
};

// AnalysisResultにroadmapStepsを含んだ型
type AnalysisResultWithSteps = AnalysisResult & {
  roadmapSteps: LearningRoadmapStep[];
};

const fetcher = (url: string) => apiClient(url);

// スマートフォン専用の下部ナビゲーション
const MobileNav: FC = () => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] z-50">
    <nav className="flex justify-around items-center h-16">
      <Link href="/talent/profile" className="flex flex-col items-center justify-center text-slate-700 hover:bg-slate-100 p-2 rounded-md w-24">
        <PencilSquareIcon className="h-6 w-6" />
        <span className="text-xs mt-1">プロフィール</span>
      </Link>
    </nav>
  </div>
);

// --- メインコンポーネント ---
export default function TalentMyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // --- 修正後のデータ取得 ---

  // 1. まずプロフィール情報だけを取得する
  const { data: profile, isLoading: isProfileLoading } = useSWR<TalentProfile | null>(
    status === "authenticated" ? `/api/talent/profile` : null,
    fetcher
  );

  // 2. プロフィールが存在する場合にのみ、他のデータを取得する
  const { data: applications } = useSWR<ApplicationWithJob[]>(
    profile ? '/api/talent/applications' : null, // profileが存在する場合のみfetch
    fetcher
  );

  const { data: latestAnalysis } = useSWR<AnalysisResultWithSteps | null>(
    profile ? `/api/talent/diagnosis/latest` : null, // profileが存在する場合のみfetch
    fetcher
  );

  const { data: companies } = useSWR<CompanyForList[]>(
    '/api/companies/list',
    fetcher

  );

  // 3. プロフィール取得が完了し、プロフィールが存在しない場合にリダイレクトするロジック
   useEffect(() => {
    // ローディング中でなく、セッションがあり、プロフィールデータがnull（またはエラーで取得できなかった）場合
    if (!isProfileLoading && status === "authenticated" && !profile) {
      // 403エラーの場合も!profileになるので、これでハンドリングできる
      router.push('/talent/profile');
    }
  }, [profile, isProfileLoading, status, router]);

  const { mutate } = useSWRConfig(); // useSWRConfigからmutateを取得

  // --- Quiz機能のロジック（blob→PostgreSQL移行未対応のため一時停止） ---
  // const [quiz, setQuiz] = useState<SecurityQuiz | null>(null);
  // const [quizLoading, setQuizLoading] = useState(true);
  // const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  // const [showExplanation, setShowExplanation] = useState(false);

  // useEffect(() => {
  //   fetch('/api/quiz/daily').then(res => res.json()).then(data => setQuiz(data))
  //     .catch(err => console.error("Failed to fetch quiz", err))
  //     .finally(() => setQuizLoading(false));
  // }, []);

  const handleCancelApplication = async (applicationId: string) => {
    if (!window.confirm('この応募を取り消しますか？')) return;

    try {
      const response = await fetch('/api/talent/applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        throw new Error('応募の取り消しに失敗しました。');
      }

      // 成功したら、リストを再取得して表示を更新
      mutate('/api/talent/applications');
      alert('応募を取り消しました。');

    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleDiagnoseClick = async () => {
    if (!profile) {
      alert('先にプロフィールを登録してください。');
      router.push('/talent/profile');
      return;
    }

    setIsDiagnosing(true);
    try {
      // ★ 変更点: 新しいstart APIを呼び出す
      const response = await fetch('/api/talent/diagnosis/start', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('診断の開始に失敗しました。');
      }

      const { analysisId } = await response.json();

      // ★ 変更点: すぐに結果ページに遷移する
      router.push(`/talent/diagnosis/${analysisId}`);

    } catch (error) {
      console.error(error);
      alert('エラーが発生しました。もう一度お試しください。');
      setIsDiagnosing(false);
    }
  };

  const isLoading = status === 'loading' || isProfileLoading;

  if (isLoading) {
    return <Layout><Spinner /></Layout>;
  }

  if (status !== 'authenticated') {
    return (
      <Layout><div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">マイページ</h1>
        <p className="mb-6 text-gray-600">全ての機能を利用するにはサインインが必要です。</p>
        <button onClick={() => signIn()} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">サインイン</button>
      </div></Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-16 md:pb-0">
        <div className="flex min-h-screen bg-slate-50">
          <aside className="hidden md:block w-72 flex-shrink-0 p-6 bg-white border-r border-slate-200">
            <div className="flex items-center gap-4 mb-8">
              <UserCircleIcon className="h-12 w-12 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-800">{session?.user?.name || "Unknown User"}</p>
                <p className="text-sm text-slate-500 break-all">{session?.user?.email}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              <Link href="/talent/profile" className="flex items-center gap-3 px-3 py-2 text-slate-700 rounded-md hover:bg-slate-100">
                <PencilSquareIcon className="h-5 w-5 text-slate-500" />
                プロフィール編集
              </Link>
              <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 text-red-600 rounded-md hover:bg-red-50 mt-8">
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                サインアウト
              </button>
            </nav>
          </aside>

          <main className="flex-1 p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">
              こんにちは、{profile?.fullName || session?.user?.name?.split(' ')[0] || 'ゲスト'}さん
            </h1>
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex-1">
                  <SparklesIcon className="h-8 w-8 mb-4 opacity-70" />
                  <h2 className="text-2xl font-bold mb-2">AIスキル診断</h2>
                  <p className="opacity-90">あなたのスキルをAIが分析し、キャリアパスや学習プランを提案します。</p>
                </div>
                <div className="flex-shrink-0">
                  <button onClick={handleDiagnoseClick} disabled={isDiagnosing}
                    className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors w-full sm:w-auto disabled:bg-slate-200 disabled:text-slate-500">
                    {isDiagnosing ? '診断中...' : (latestAnalysis ? '再診断する' : '今すぐ診断する')}
                  </button>
                </div>
              </div>
              <div className="bg-purple-600 text-white p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex-1">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 mb-4 opacity-70" />
                  <h2 className="text-2xl font-bold mb-2">AIスキルインタビュー</h2>
                  <p className="opacity-90">AIとの対話を通じて、あなたの潜在的なスキルや経験を深掘りします。</p>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/talent/skill-chat"
                    className="bg-white text-purple-600 font-semibold px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors w-full sm:w-auto"
                  >
                    インタビューを開始 / 再開する
                  </Link>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center gap-3 mb-4">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-slate-500" />
                    <h2 className="text-lg font-semibold text-slate-800">応募状況</h2>
                </div>

                {(applications && applications.length > 0) ? (
                  <ul role="list" className="divide-y divide-slate-200">
                    {applications.map((app) => (
                      <li key={app.id} className="py-4 flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4 flex-grow">
                          <div className="h-10 w-10 rounded-full bg-white border p-1 flex items-center justify-center flex-shrink-0">
                            <img
                              src={app.job.company.logoUrl || `https://placehold.co/40x40/e2e8f0/334155?text=${app.job.company.name.charAt(0)}`}
                              alt={`${app.job.company.name}のロゴ`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="flex-grow">
                            <p className="text-sm font-medium text-slate-900 truncate">{app.job.title}</p>
                            <p className="text-sm text-slate-500">{app.job.company.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{format(new Date(app.createdAt), 'yyyy/MM/dd')}に応募</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {app.status}
                          </span>
                          <button
                            onClick={() => handleCancelApplication(app.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            取り消す
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-sm text-slate-500 py-4">
                    現在応募中の求人はありません。
                  </p>
                )}
              </div>

              {/* 求人検索カード */}
              <Link href="/jobs" className="block group">
                <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex-1">
                      <BriefcaseIcon className="h-8 w-8 mb-4 text-teal-600" />
                      <h2 className="text-2xl font-bold mb-2 text-slate-800">求人を探す</h2>
                      <p className="text-slate-600">あなたのスキルにマッチする企業からのオファーを見つけましょう。</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg group-hover:bg-teal-700 transition-colors">
                        一覧を見る
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center gap-3 mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">あなたの学習計画</h2>
                </div>
                {latestAnalysis && latestAnalysis.roadmapSteps.length > 0 ? (
                  <ul className="space-y-3">
                    {latestAnalysis.roadmapSteps.map((step) => (
                      <li key={step.id}>
                        <Link href={`/talent/learning/${step.id}`}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors group text-left">
                          {step.isCompleted ? (
                            <CheckCircleIcon className="h-7 w-7 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                              {step.stepNumber}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{step.title}</p>
                            <p className="text-sm text-slate-500">詳細を確認する</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    AIスキル診断を実行すると、ここに学習計画が表示されます。
                  </p>
                )}
              </div>

              {/* 今日の一問カード（blob→PostgreSQL移行未対応のため一時停止） */}
              {/*
              <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center gap-3 mb-4">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">今日の一問</h2>
                </div>
                {quizLoading ? (<p className="text-slate-500">読み込み中...</p>)
                  : quiz ? (
                    <div>
                      <p className="font-semibold text-slate-700 mb-4">Q. {quiz.question}</p>
                      <div className="space-y-2 mb-4">
                        {quiz.choices.map((choice, idx) => (
                          <button key={idx} onClick={() => { setSelectedChoice(choice); setShowExplanation(true); }} disabled={!!selectedChoice}
                            className={`w-full px-4 py-2 rounded-lg border text-left transition-all text-sm ${selectedChoice ? (choice === quiz.answer ? 'bg-green-100 border-green-400 text-green-800 font-semibold' : (selectedChoice === choice ? 'bg-red-100 border-red-400 text-red-800' : 'bg-slate-50 text-slate-500 border-slate-200')) : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                            {choice}
                          </button>
                        ))}
                      </div>
                      {showExplanation && (
                        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                          <p className="font-semibold mb-2">{selectedChoice === quiz.answer ? '🎉 正解！' : '不正解...'}</p>
                          <p className="text-slate-600 mb-2">{quiz.explanation}</p>
                        </div>
                      )}
                    </div>
                  ) : (<p className="text-slate-500">今日のクイズはありません。</p>)}
              </div>
              */}

              <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center gap-2 mb-4">
                  <BuildingOffice2Icon className="h-6 w-6 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">注目の企業</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(companies || []).map((company) => (
                    <Link key={company.corporateNumber} href={`/companies/${company.corporateNumber}`}
                      className="p-4 border rounded-lg flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-white border p-1 flex items-center justify-center flex-shrink-0">
                        <img
                          src={company.logoUrl || `https://placehold.co/40x40/e2e8f0/334155?text=${company.name.charAt(0)}`}
                          alt={`${company.name}のロゴ`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{company.name}</p>
                        <p className="text-xs text-slate-500">{company.industry}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </Layout>
  );
}
