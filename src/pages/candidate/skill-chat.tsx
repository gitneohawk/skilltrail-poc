import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { SkillInterviewMessage } from '@/types/SkillInterviewBlob';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { getDefaultProvider } from '@/utils/azureBlob';

export default function SkillChat() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const provider = getDefaultProvider(session);
  const userId = encodeURIComponent(session?.user?.sub || 'unknown');

  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<SkillInterviewMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const { data: profileData } = useSWR(
    status === 'authenticated' ? `/api/candidate/profile/${provider}/${userId}` : null,
    fetcher,
    { shouldRetryOnError: false }
  );

  useEffect(() => {
    if (status !== 'authenticated' || !userId || !session) return;

    const loadPreviousEntries = async () => {
      if (!session) {
        console.error('Session is not available.');
        return;
      }

      try {
        const res = await fetch('/api/ai/skill-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loadHistory: true }),
        });
        const blob = await res.json();
        if (blob?.entries?.length) {
          setEntries(blob.entries);
        } else {
          const initialMessage: SkillInterviewMessage = {
            id: Date.now(),
            role: 'assistant',
            message: 'ここではスキルのインタビューを行います。5〜8往復程度で終了します。終了したい場合はマイページへ戻るをクリックして終了してください。まず、あなたの経験をまとめてAIに送ってください。',
            timestamp: new Date().toISOString(),
          };
          setEntries([initialMessage]);
        }
      } catch (e) {
        console.error('Failed to load previous skill interview blob:', e);
      }
    };

    loadPreviousEntries();
  }, [status, userId, session]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const userEntry: SkillInterviewMessage = {
      id: Date.now(),
      role: 'user',
      message: input,
      timestamp: new Date().toISOString(),
    };
    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setIsLoading(true);

    try {
      // 新方式: ユーザー入力ごとにAIで構造化＋次の質問生成
      const res = await fetch('/api/ai/skill-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider,
          entry: userEntry,
          entries: [...entries, userEntry], // 直近までの会話履歴
          profile: profileData, // 現状のスキル情報
        }),
      });
      const data = await res.json();
      // data: { nextQuestion: string, structuredSkills: any, error?: string }
      if (data.error) {
        alert(`AI処理に失敗しました: ${data.error}`);
        return;
      }
      // スキル構造化結果をstateに反映（必要に応じてUIで表示・保存）
      // ここでは一旦console.logのみ
      if (data.structuredSkills) {
        console.log('[AI構造化スキル]', data.structuredSkills);
        // TODO: 必要に応じてstateやUIに反映
      }
      // 次の質問をAIから受け取り、entriesに追加
      if (data.nextQuestion) {
        setEntries(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          message: data.nextQuestion,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        // nextQuestionがnullならインタビュー終了メッセージを追加
        setEntries(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          message: 'インタビューは終了しました。マイページへ戻るをクリックしてください。',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      console.error('Error during chat:', e);
      alert('AIとの通信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return; // Prevent send during IME composition
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSkillExtraction = async () => {
    setIsExtracting(true);
    try {
      const res = await fetch('/api/ai/skill-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider, blob: { entries }, profile: profileData }),
      });
      const result = await res.json();
      // TODO: 必要に応じてUIでスキルセットを表示
      alert('スキル分析が完了しました');
    } catch (err) {
      console.error('[skill-extraction] failed:', err);
      alert('スキル分析に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // 入力欄・送信ボタンの無効化判定
  const isInterviewEnded = entries.some(e => e.message.includes('インタビューは終了しました'));

  return (
    <Layout>
      <div className="flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-3xl space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xl p-4 rounded text-sm whitespace-pre-wrap shadow ${
                  entry.role === 'user'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {entry.message}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>
        <div className="mt-6 w-full max-w-3xl flex flex-col sm:flex-row gap-2">
          <textarea
            className="flex-1 min-h-[80px] border border-gray-300 rounded p-2 resize-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください"
            disabled={isInterviewEnded || isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || isInterviewEnded}
            className="self-end w-auto px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            {isLoading ? '送信中...' : '送信'}
          </button>
        </div>
        {isLoading && (
          <div className="mt-2 text-blue-600 text-sm">AIの応答を待っています...</div>
        )}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/candidate/mypage')}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            マイページへ戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}