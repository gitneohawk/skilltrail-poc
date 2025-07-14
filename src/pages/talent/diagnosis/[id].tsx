// /pages/talent/diagnosis/[id].tsx

import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AnalysisResult, LearningRoadmapStep } from '@prisma/client';
import { FC } from 'react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

type AnalysisResultWithSteps = AnalysisResult & {
  roadmapSteps: LearningRoadmapStep[];
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

  const { data: result, error, isLoading } = useSWR<AnalysisResultWithSteps>(
    diagnosisId ? `/api/talent/diagnosis/${diagnosisId}` : null,
    fetcher
  );

  if (isLoading) {
    return <Layout><div className="text-center p-10">診断結果を読み込んでいます...</div></Layout>;
  }
  if (error) {
    return <Layout><div className="text-center p-10 text-red-500">エラーが発生しました。</div></Layout>;
  }
  if (!result) {
    return <Layout><div className="text-center p-10">診断結果が見つかりません。</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-slate-800">AIキャリア診断結果</h1>

        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200">
          <TextSection title="要約" text={result.summary} />
          <TextSection title="あなたの強み" text={result.strengths} />
          <TextSection title="今後のアドバイス" text={result.advice} />
          <TextSection title="スキルギャップ分析" text={result.skillGapAnalysis} />
          <TextSection title="実務経験を積む方法" text={result.experienceMethods} />

          {/* 学習ロードマップ */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-500 pb-2 mb-6">学習ロードマップ</h2>
            <div className="space-y-6">
              {result.roadmapSteps.map(step => {
                // detailsがJSON文字列の場合があるのでパースする
                const details = typeof step.details === 'string' ? JSON.parse(step.details) : step.details;

                return (
                  <div key={step.id} id={`step-${step.id}`} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xl">
                        {step.stepNumber}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                    </div>
                    <div className="prose prose-slate max-w-none pl-14">
                      <p>{details.description}</p>
                      <h4>推奨アクション</h4>
                      <ul>
                        {details.recommendedActions?.map((action: string, i: number) => <li key={i}>{action}</li>)}
                      </ul>
                      <h4>参考リソース</h4>
                      <ul>
                        {details.referenceResources?.map((resource: string, i: number) => <li key={i}>{resource}</li>)}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
            <Link href="/talent/mypage" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
              マイページへ戻る
            </Link>
        </div>
      </div>
    </Layout>
  );
}
