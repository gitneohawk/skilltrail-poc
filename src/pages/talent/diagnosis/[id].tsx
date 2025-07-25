// /pages/talent/diagnosis/[id].tsx

import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AnalysisResult, LearningRoadmapStep } from '@prisma/client';
import { FC } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { apiClient } from '@/lib/apiClient';

const fetcher = (url: string) => apiClient(url);

type AnalysisResultWithSteps = AnalysisResult & {
  roadmapSteps: LearningRoadmapStep[];
  diagnosisStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
};

// --- ヘルパーコンポーネント ---
const TextSection: FC<{ title: string; text?: string | null }> = ({ title, text }) => {
  if (!text) return null;
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-500 pb-2 mb-4">{title}</h2>
      <div className="prose prose-slate max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </section>
  );
};

// --- メインコンポーネント ---
export default function DiagnosisResultPage() {
  const router = useRouter();
  const { id: diagnosisId } = router.query;

  const { data: result, error } = useSWR<AnalysisResultWithSteps>(
    diagnosisId ? `/api/talent/diagnosis/${diagnosisId}` : null,
    fetcher,
    {
      refreshInterval: data => (data?.diagnosisStatus === 'COMPLETED' || data?.diagnosisStatus === 'FAILED') ? 0 : 3000,
    }
  );

  const renderContent = () => {
    if (error) return <div className="text-center p-10 text-red-500">エラーが発生しました。</div>;
    if (!result) return <div className="text-center p-10">診断結果を読み込んでいます...</div>;

    switch (result.diagnosisStatus) {
      case 'PENDING':
      case 'PROCESSING':
        return (
          <div className="text-center p-10">
            <p className="animate-pulse">AIが診断結果を生成中です...</p>
            <p className="text-sm text-slate-500 mt-2">(このページは自動で更新されます)</p>
          </div>
        );
      case 'FAILED':
        return <div className="text-center p-10 text-red-500">診断に失敗しました。時間をおいて再度お試しください。</div>;
      case 'COMPLETED':
        return (
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200">
            <TextSection title="要約" text={result.summary} />
            <TextSection title="あなたの強み" text={result.strengths} />
            <TextSection title="今後のアドバイス" text={result.advice} />
            <TextSection title="スキルギャップ分析" text={result.skillGapAnalysis} />
            <TextSection title="実務経験を積む方法" text={result.experienceMethods} />
            <section>
              <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-500 pb-2 mb-6">学習ロードマップ</h2>
              <div className="space-y-6">
                {result.roadmapSteps.map(step => {
                  const details = typeof step.details === 'string' ? JSON.parse(step.details) : step.details;
                  return (
                    <div key={step.id} id={`step-${step.id}`} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                       <div className="flex items-center gap-4 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xl">{step.stepNumber}</div>
                        <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                      </div>
                      <div className="prose prose-slate max-w-none pl-14">
                        <p>{details.description}</p>
                        <h4>推奨アクション</h4>
                        <ul>{details.recommendedActions?.map((action: string, i: number) => <li key={i}>{action}</li>)}</ul>
                        <h4>参考リソース</h4>
                        <ul>{details.referenceResources?.map((resource: string, i: number) => <li key={i}>{resource}</li>)}</ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        );
      default:
        return <div className="text-center p-10">不明な状態です。</div>;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/talent/mypage" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeftIcon className="h-4 w-4" />
            マイページに戻る
          </Link>
        </div>

        {renderContent()}

      </div>
    </Layout>
  );
}
