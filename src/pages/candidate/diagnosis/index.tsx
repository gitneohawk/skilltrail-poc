import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState, FC } from 'react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 表示する診断結果の型を定義
interface DiagnosisContent {
  summary?: string;
  strengths?: string;
  recommendations?: string;
  skillGapAnalysis?: string;
  practicalSteps?: string;
  learningRoadmapJson?: string; // JSON文字列を受け取る
}
// 学習ロードマップのステップの型
interface RoadmapStep {
  stage: number;
  title: string;
  skills: string[];
  actions: string[];
  resources: string[];
}

// テキストセクションを描画するコンポーネント
const TextSection: FC<{ title: string; text?: string }> = ({ title, text }) => {
  if (!text) return null;
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-800 mb-3">{title}</h2>
      <div className="prose prose-slate max-w-none text-slate-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  );
};

export default function DiagnosisPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [content, setContent] = useState<DiagnosisContent>({});
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.sub) {
      if (status === 'unauthenticated') {
        setError('この機能を利用するにはサインインが必要です。');
        setIsLoading(false);
      }
      return;
    }

      const eventSource = new EventSource(`/api/diagnosis/generate?provider=azure&sub=${encodeURIComponent(session.user.sub)}`);
      let buffer = '';

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          setIsLoading(false);
        // ストリーム完了後、最終的なJSONを解析してロードマップを設定
        try {
          const finalContent = JSON.parse(buffer);
          if (finalContent.learningRoadmapJson) {
            const roadmapData = JSON.parse(finalContent.learningRoadmapJson);
            setRoadmap(roadmapData || []);
          }
        } catch (e) {
          console.error("最終的なJSONの解析に失敗:", e);
        }
          return;
        }
        buffer += event.data;
        try {
          const parsed = JSON.parse(buffer);
          setContent(parsed);
        } catch (e) {
          // JSONがまだ不完全な場合は何もしない
        }
      };

      eventSource.addEventListener('error', (event: any) => {
        if (event.data) {
          try {
            const errorData = JSON.parse(event.data);
            setError(`エラー: ${errorData.message}`);
          } catch {
            setError('不明なエラーが発生しました。');
          }
        } else {
          setError('AIとの通信に失敗しました。');
        }
        setIsLoading(false);
        eventSource.close();
      });

      return () => eventSource.close();
  }, [status, session]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">AIキャリア診断結果</h1>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 min-h-[400px]">
          {isLoading && Object.keys(content).length === 0 && !error && (
            <p className="text-slate-500 animate-pulse">AIが診断結果を生成中です...</p>
          )}
          {error && <div className="text-red-500">{error}</div>}

          <TextSection title="要約" text={content.summary} />
          <TextSection title="強み" text={content.strengths} />
          <TextSection title="今後のアドバイス" text={content.recommendations} />
          <TextSection title="スキルギャップ分析" text={content.skillGapAnalysis} />
          <TextSection title="実務経験を積む方法" text={content.practicalSteps} />

          {/* ▼▼▼【ここを修正】JSONデータからロードマップを描画▼▼▼ */}
          {roadmap.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">学習ロードマップ</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                {roadmap.map((step, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-6 h-full flex flex-col relative">
                    <div className="absolute -top-4 -left-4 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {step.stage || index + 1}
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
                    <div className="text-sm text-slate-600 space-y-3">
                      <p><strong>習得スキル:</strong> {(step.skills || []).join(', ')}</p>
                      <p><strong>推奨アクション:</strong> {(step.actions || []).join(', ')}</p>
                      <p><strong>参考リソース:</strong> {(step.resources || []).join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ▲▲▲【ここまでを修正】▲▲▲ */}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/candidate/mypage')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            マイページへ戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
