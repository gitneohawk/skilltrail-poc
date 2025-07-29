// /pages/talent/learning/[stepId].tsx (エラー修正版)

import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { apiClient } from '@/lib/apiClient';

// SWR用のデータ取得関数
const fetcher = (url: string) => apiClient(url);

// APIからのレスポンスの型
interface StepDetailResponse {
  content: string;
}

// メインのページコンポーネント
export default function LearningStepDetailPage() {
  const router = useRouter();
  const { stepId } = router.query;

  // ★ 修正点: 正しいAPIエンドポイントを呼び出す
  const { data, error, isLoading } = useSWR<StepDetailResponse>(
    stepId ? `/api/talent/diagnosis/step-details?stepId=${stepId}` : null,
    fetcher
  );

  // コンテンツをレンダリングする内部関数
  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-10 animate-pulse">読み込み中...</div>;
    }
    if (error) {
      return <div className="text-center p-10 text-red-500">詳細の取得に失敗しました。</div>;
    }
    if (!data?.content) {
      return <div className="text-center p-10">コンテンツが見つかりません。</div>;
    }

    // ReactMarkdownを使って、AIが生成したMarkdownテキストを表示
    return (
      <div className="prose prose-slate max-w-none
        prose-h2:border-b-2 prose-h2:border-blue-500 prose-h2:pb-2
        prose-h3:text-slate-700 prose-ul:list-disc prose-ul:pl-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/talent/mypage" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            マイページに戻る
          </Link>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 min-h-[300px]">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}
