import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import { RoadmapStep } from '@/types/learning-plan';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useMemo } from 'react';

// --- メインコンポーネント ---
export default function LearningStagePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // URLから現在のステージ番号を取得
  const { stage } = router.query;

  // --- データ取得ロジック ---
  const jsonFetcher = (url: string) => fetch(url).then(res => res.json());
  const textFetcher = (url: string) => fetch(url).then(res => res.text());

  // 1. 学習計画の全体データを取得
  const { data: roadmapData, error: roadmapError } = useSWR<any>( // 一時的にany型で受け取る
    status === "authenticated" ? `/api/candidate/learning-plan` : null,
    jsonFetcher
  );

  // ▼▼▼【ここを修正】データ形式の揺らぎを吸収する▼▼▼
  // APIから返ってきたデータがオブジェクトでも配列でも、安全に配列を取り出す
  const roadmap = useMemo(() => {
    if (!roadmapData) return null;
    return Array.isArray(roadmapData) ? roadmapData : roadmapData.learningRoadmap;
  }, [roadmapData]);
  // ▲▲▲【ここまでを修正】▲▲▲

  // 2. 概要データから、現在のステップ情報を見つけ出す
  const currentStep = roadmap?.find((step: RoadmapStep) => step.stage.toString() === stage);

  // 3. 現在のステップが確定したら、そのステップ用の詳細コンテンツをAPIから取得する
  const { data: detailedContent, error: detailError } = useSWR<string>(
    currentStep ? `/api/learning/detail?stage=${currentStep.stage}` : null,
    textFetcher
  );

  // --- レンダリングロジック ---

  // データ取得中またはステージ情報が見つからない場合の表示
  if (!roadmap || (router.isReady && !currentStep)) {
    return (
      <Layout>
        <div className="text-center p-12">
          {router.isReady ? '指定された学習ステップが見つかりません。' : '読み込み中...'}
        </div>
      </Layout>
    );
  }

  // エラーが発生した場合の表示
  if (roadmapError) {
    return (
      <Layout>
        <div className="text-center p-12 text-red-500">
          学習計画の読み込みに失敗しました。
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/candidate/mypage" legacyBehavior>
            <a className="text-blue-600 hover:underline">
              &larr; マイページに戻る
            </a>
          </Link>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200">
          <div className="relative mb-6">
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
              ステップ {currentStep.stage}
            </span>
            <h1 className="text-3xl font-bold text-slate-800 mt-2">{currentStep.title}</h1>
          </div>

          <div className="border-t border-slate-200 pt-6">
            {/* 詳細コンテンツのローディングとエラー表示 */}
            {!detailedContent && !detailError && (
              <p className="text-slate-500 animate-pulse">詳細な学習コンテンツを読み込んでいます...</p>
            )}
            {detailError && (
              <p className="text-red-500">詳細コンテンツの読み込みに失敗しました。</p>
            )}

            {/* 取得したMarkdownコンテンツを表示 */}
            {detailedContent && (
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {detailedContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
