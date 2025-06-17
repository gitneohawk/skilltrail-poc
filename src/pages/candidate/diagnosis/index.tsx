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
    return <div className="p-4">診断結果を取得中です...</div>;
  }

  if (!result) {
    return <div className="p-4">診断結果が取得できませんでした。</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AIキャリア診断結果</h1>
      <div className="mb-4">
        <h2 className="font-semibold">要約</h2>
        <p>{result.summary}</p>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold">強み</h2>
        <ul className="list-disc list-inside">
          {result.strengths.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold">今後のアドバイス</h2>
        <ul className="list-disc list-inside">
          {result.recommendations.length === 0 ? (
            <li>現時点では具体的なアドバイスがありません。</li>
          ) : (
            result.recommendations.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
