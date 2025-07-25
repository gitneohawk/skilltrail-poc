import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SkillInterviewMessage } from '@prisma/client';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { UserCircleIcon, CpuChipIcon, PaperAirplaneIcon, ArrowUturnLeftIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { apiClient } from '@/lib/apiClient';

const fetcher = (url: string) => apiClient(url);

export default function SkillChat() {
  const { status } = useSession();
  const router = useRouter();

  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<SkillInterviewMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);

  // スキル抽出の状態を詳細に管理
  const [extractionStatus, setExtractionStatus] = useState<'IDLE' | 'STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 会話履歴の読み込み
  useEffect(() => {
    if (status !== 'authenticated') return;
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/talent/skill-interview');
        if (!res.ok) throw new Error('Failed to fetch history');
        const history: SkillInterviewMessage[] = await res.json();

        if (history.length > 0) {
          setEntries(history);
          // 履歴から最新のinterviewIdを設定
          setCurrentInterviewId(history[0].interviewId);
        } else {
          const initialMessage = { id: 'initial', role: 'assistant', content: 'あなたの経験や得意な技術について教えてください。', createdAt: new Date(), interviewId: 'none' };
          // @ts-ignore
          setEntries([initialMessage]);
        }
      } catch (e) {
        console.error('Failed to load skill interview history:', e);
      }
    };
    loadHistory();

    // コンポーネントがアンマウントされるときにポーリングを停止
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [status]);

  // ポーリング（状況確認）ロジック
  useEffect(() => {
    // extractionStatusが'STARTED'になり、interviewIdが確定したらポーリングを開始
    if (extractionStatus === 'STARTED' && currentInterviewId) {
      setExtractionStatus('PROCESSING'); // 即座にUIを「処理中」へ
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/talent/skill-interview/extract/status?interviewId=${currentInterviewId}`);
          if (!res.ok) { // ネットワークエラー等
             throw new Error('Status check failed');
          }
          const data = await res.json();

          if (data.extractionStatus === 'COMPLETED') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setExtractionStatus('COMPLETED');
            alert('スキル抽出が完了しました！');
            router.push('/talent/skill-check'); // 完了後に確認ページへリダイレクト
          } else if (data.extractionStatus === 'FAILED') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setExtractionStatus('FAILED');
            alert(`スキル抽出に失敗しました: ${data.extractionError || '不明なエラー'}`);
          }
          // PROCESSING中はポーリングを継続
        } catch (err) {
            console.error('Polling error:', err);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setExtractionStatus('FAILED');
        }
      }, 3000); // 3秒ごとに状況を確認
    }
  }, [extractionStatus, currentInterviewId, router]);


  // メッセージ送信処理
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input;
    const userEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      createdAt: new Date(),
      interviewId: currentInterviewId || 'none',
    };
    // @ts-ignore
    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/talent/skill-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });
      if (!res.ok) throw new Error('AIからの応答取得に失敗しました。');
      const assistantMessage: SkillInterviewMessage = await res.json();
      setEntries(prev => [...prev, assistantMessage]);
      if(!currentInterviewId) {
        setCurrentInterviewId(assistantMessage.interviewId);
      }
    } catch (e) {
      console.error('Error during chat:', e);
      const errorMessage = { id: `error-${Date.now()}`, role: 'assistant', content: 'エラーが発生しました。もう一度試すか、時間をおいてから再度お試しください。', createdAt: new Date(), interviewId: 'none' };
      // @ts-ignore
      setEntries(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // インタビューリセット処理
  const handleResetInterview = async () => {
    const isConfirmed = window.confirm('本当にインタビューをリセットしますか？会話履歴は保存されますが、新しい会話が始まります。');
    if (!isConfirmed) return;

    try {
      await fetch('/api/talent/skill-interview', { method: 'DELETE' });
      const initialMessage = { id: 'initial-reset', role: 'assistant', content: 'インタビューがリセットされました。あなたの経験や得意な技術について教えてください。', createdAt: new Date(), interviewId: 'none' };
      // @ts-ignore
      setEntries([initialMessage]);
      setInput('');
      setCurrentInterviewId(null);
      setExtractionStatus('IDLE');
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      alert('インタビューがリセットされました。');
    } catch (err) {
      console.error('インタビューリセットに失敗しました:', err);
      alert('インタビューリセットに失敗しました');
    }
  };

  // スキル抽出の開始処理
  const handleSkillExtraction = async () => {
    if (!currentInterviewId || currentInterviewId === 'none') {
      alert('対象のインタビューが見つかりません。一度メッセージを送信してください。');
      return;
    }

    try {
      // Step A: 処理開始をリクエスト（これはすぐ終わる）
      const startRes = await fetch('/api/talent/skill-interview/extract/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: currentInterviewId }),
      });
      if (startRes.status !== 202) {
        throw new Error('抽出処理の開始リクエストに失敗しました。');
      }

      // ★ 変更点: 抽出処理のステータスを更新し、ポーリングを開始
      setExtractionStatus('STARTED');

      // Step B: 実際の重い処理を実行するAPIを呼び出す（応答は待たない）
      fetch('/api/talent/skill-interview/extract/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: currentInterviewId }),
      });

    } catch (err) {
      console.error('[skill-extraction] start failed:', err);
      alert('抽出処理の開始に失敗しました。');
      setExtractionStatus('IDLE');
    }
  };


  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const isProcessing = isLoading || extractionStatus === 'PROCESSING' || extractionStatus === 'STARTED';

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
        {/* ヘッダーエリア */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">AIスキルインタビュー</h1>
          <button onClick={() => router.push('/talent/mypage')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
            <ArrowUturnLeftIcon className="h-4 w-4" />
            マイページへ戻る
          </button>
        </div>

        {/* チャットウィンドウ */}
        <div className="flex-1 bg-white flex flex-col">
          {/* メッセージ表示エリア (スクロール) */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className={`flex items-end gap-3 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  {entry.role === 'user' ? <UserCircleIcon className="h-6 w-6 text-slate-500" /> : <CpuChipIcon className="h-6 w-6 text-blue-600" />}
                </div>
                <div className={`max-w-lg p-3 rounded-lg text-sm whitespace-pre-wrap shadow-sm ${entry.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                  {entry.content}
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
                rows={3} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isProcessing ? "処理中です..." : "メッセージを入力... (Shift+Enterで改行)"}
                disabled={isProcessing}
              />
              <button onClick={handleSubmit} disabled={!input.trim() || isProcessing}
                className="h-10 w-10 flex-shrink-0 bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center justify-center transition-colors">
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <button onClick={handleSkillExtraction} disabled={isProcessing || entries.length <= 1}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                {
                  {
                    'IDLE': '完了してスキルを抽出',
                    'STARTED': '処理を開始しました...',
                    'PROCESSING': '抽出中です...',
                    'COMPLETED': '抽出完了',
                    'FAILED': 'エラーが発生'
                  }[extractionStatus]
                }
              </button>
              <button onClick={handleResetInterview} disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-500 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50">
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
