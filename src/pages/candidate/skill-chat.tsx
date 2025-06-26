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
            message: 'ここではスキルのインタビューをします。AIとのやりとりが終わったら「スキルセット終了」と入力してください。',
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
      const res = await fetch('/api/ai/skill-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, entry: userEntry }),
      });
      const data = await res.json();
      if (data.reply) {
        setEntries(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          message: data.reply,
          timestamp: new Date().toISOString(),
        }]);
      }
      if (input.trim() === 'スキルセット終了') {
        try {
          const res = await fetch('/api/ai/skill-extraction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, blob: [...entries, userEntry] }),
          });
          const result = await res.json();
          console.log('[skill-extraction] result:', result);
          // TODO: Show extracted skills in UI for user confirmation
        } catch (err) {
          console.error('[skill-extraction] failed:', err);
        }
      }
    } catch (e) {
      console.error('Error during chat:', e);
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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

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
            className="flex-1 min-h-[80px] border border-gray-300 rounded p-2 resize-none"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="self-end w-auto px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            送信
          </button>
        </div>
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