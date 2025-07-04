import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { SkillInterviewMessage } from '@/types/SkillInterviewBlob';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { UserCircleIcon, CpuChipIcon, PaperAirplaneIcon, ArrowUturnLeftIcon, ArrowPathIcon } from '@heroicons/react/24/solid'; // アイコンをインポート


export default function SkillChat() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const provider = 'azure'; // getDefaultProviderを削除し、固定値に変更
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

  const handleResetInterview = async () => {
    try {
      const initialMessage: SkillInterviewMessage = {
        id: Date.now(),
        role: 'assistant',
        message: 'ここではスキルのインタビューを行います。5〜8往復程度で終了します。終了したい場合はマイページへ戻るをクリックして終了してください。まず、あなたの経験をまとめてAIに送ってください。',
        timestamp: new Date().toISOString(),
      };
      setEntries([initialMessage]);
      setInput('');

      // Blobのskillset関連情報をクリアするAPI呼び出し
      await fetch('/api/ai/skill-interview/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider }),
      });

      alert('インタビュー内容がリセットされました');
    } catch (err) {
      console.error('インタビューリセットに失敗しました:', err);
      alert('インタビューリセットに失敗しました');
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // 入力欄・送信ボタンの無効化判定
  const isInterviewEnded = entries.some(e => e.message.includes('インタビューは終了しました'));


// ...関数の定義などは変更なし

// ▼▼▼ return文以降を全て書き換える ▼▼▼
return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[900px] max-w-4xl mx-auto">

        {/* --- ヘッダーエリア --- */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">AIスキルインタビュー</h1>
          <button
            onClick={() => router.push('/candidate/mypage')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            マイページへ戻る
          </button>
        </div>

        {/* --- チャットウィンドウ --- */}
        <div className="flex-1 bg-white flex flex-col">
          {/* メッセージ表示エリア (スクロール) */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {entries.map((entry, idx) => (
              <div key={idx} className={`flex items-end gap-3 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* アバター */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  {entry.role === 'user' ? (
                    <UserCircleIcon className="h-6 w-6 text-slate-500" />
                  ) : (
                    <CpuChipIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                {/* チャットバブル */}
                <div
                  className={`max-w-lg p-3 rounded-lg text-sm whitespace-pre-wrap shadow-sm ${
                    entry.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {entry.message}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <CpuChipIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="max-w-lg p-3 rounded-lg text-sm bg-slate-100 text-slate-400 rounded-bl-none shadow-sm">
                  <span className="animate-pulse">考え中...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 入力エリア */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2 p-1 border border-slate-300 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
              <textarea
                className="flex-1 resize-none bg-transparent focus:outline-none p-2"
                rows={3}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isInterviewEnded ? "インタビューは終了しました。" : "メッセージを入力... (Shift+Enterで改行)"}
                disabled={isInterviewEnded || isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading || isInterviewEnded}
                className="h-10 w-10 flex-shrink-0 bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center justify-center transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="text-right mt-2">
              <button
                onClick={handleResetInterview}
                className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-500 rounded-md hover:bg-slate-100 transition-colors"
                disabled={isLoading}
              >
                <ArrowPathIcon className="h-3 w-3" />
                リセット
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
