import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { DiagnosisResult } from '@/types/diagnosis-result';

export default function DiagnosisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }

    const fetchDiagnosis = async () => {
      setLoading(true);
      const provider = 'azure';
      const sub = session.user?.sub || 'unknown';
      try {
        const response = await fetch(`/api/diagnosis/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, sub }),
        });

        if (!response.ok) {
          console.error("診断API呼び出し失敗", await response.text());
          return;
        }

        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error("診断取得エラー", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosis();
  }, [session, status, router]);

  if (loading) {
    return (
      <Layout>
        <div className="p-4">診断結果を取得中です...</div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="p-4">診断結果が取得できませんでした。</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto bg-white shadow rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">AIキャリア診断結果</h1>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">要約</h2>
          <p className="text-gray-800">{result.summary}</p>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">強み</h2>
          <ul className="list-disc list-inside text-gray-800">
            {result.strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">今後のアドバイス</h2>
          <ul className="list-disc list-inside text-gray-800">
            {result.recommendations.length === 0 ? (
              <li>現時点では具体的なアドバイスがありません。</li>
            ) : (
              result.recommendations.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))
            )}
          </ul>
        </div>

        {result.skillGapAnalysis && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">スキルギャップ分析</h2>
            <p className="text-gray-800">{result.skillGapAnalysis}</p>
          </div>
        )}

        {result.learningPath && result.learningPath.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">習得すべきスキル（推奨順）</h2>
            <ol className="list-decimal list-inside text-gray-800">
              {result.learningPath.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {result.practicalSteps && result.practicalSteps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">実務経験を積む方法</h2>
            <ul className="list-disc list-inside text-gray-800">
              {result.practicalSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/candidate/mypage')}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            マイページへ戻る
          </button>
        </div>

        {/* TODO: 将来的にフリーチャットの履歴を反映した診断強化 */}
      </div>
    </Layout>
  );
}
