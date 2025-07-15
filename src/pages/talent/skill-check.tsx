// /pages/talent/skill-check.tsx (修正後)

import useSWR, { useSWRConfig } from 'swr';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import type { AiExtractedSkill } from '@prisma/client';
import { CpuChipIcon, XCircleIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useState, useEffect, FC } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// ★ 追加: 編集可能なスキルカードコンポーネント
const EditableSkillCard: FC<{
  title: string;
  skills: AiExtractedSkill[];
  onDelete: (id: string) => void;
}> = ({ title, skills, onDelete }) => (
  <div className="bg-white p-6 rounded-lg border">
    <h3 className="text-md font-semibold text-slate-700 mb-3">{title}</h3>
    {skills.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <span key={skill.id} className="inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-slate-100 text-slate-800 rounded-full">
            {skill.skillName}
            <button onClick={() => onDelete(skill.id)} className="text-slate-400 hover:text-red-500">
              <XCircleIcon className="h-4 w-4" />
            </button>
          </span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-slate-400">該当するスキルはありません。</p>
    )}
  </div>
);

export default function SkillCheckPage() {
  const router = useRouter();
  const { data: initialSkills, error, isLoading } = useSWR<AiExtractedSkill[]>('/api/talent/ai-extracted-skills', fetcher);

  // ★ 追加: 編集用の状態管理
  const [skills, setSkills] = useState<AiExtractedSkill[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // SWRで取得したデータを編集用のstateに同期
  useEffect(() => {
    if (initialSkills) {
      setSkills(initialSkills);
    }
  }, [initialSkills]);

  const handleDelete = (idToDelete: string) => {
    setSkills(currentSkills => currentSkills.filter(skill => skill.id !== idToDelete));
  };

  // ★ 追加: 保存処理
  const handleSave = async () => {
    const interviewId = initialSkills?.[0]?.interviewId;
    if (!interviewId) {
      alert('インタビュー情報が見つかりません。');
      return;
    }
    setIsSaving(true);
    try {
      const skillsToSave = skills.map(({ id, source, interviewId, ...rest }) => rest);

      const res = await fetch('/api/talent/ai-extracted-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: skillsToSave, interviewId }),
      });

      if (!res.ok) throw new Error('保存に失敗しました。');

      alert('変更を保存しました。');
      router.push('/talent/mypage');

    } catch (err) {
      console.error(err);
      alert('エラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const categorizedSkills = {
    '技術スキル': skills.filter(s => s.category === '技術スキル'),
    '役割・経験': skills.filter(s => s.category === '役割・経験'),
    'ソフトスキル': skills.filter(s => s.category === 'ソフトスキル'),
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <CpuChipIcon className="h-12 w-12 mx-auto text-blue-500" />
          <h1 className="text-2xl font-bold mt-4 text-slate-800">AIによるスキル分析結果</h1>
          <p className="mt-2 text-sm text-slate-600">
            AIが分析したスキルです。不要なものは削除し、内容を確定してください。
            <br />
            この内容は、今後のAI診断の精度向上のために利用されます。
          </p>
        </div>

        {isLoading && <p className="text-center">分析結果を読み込んでいます...</p>}
        {error && <p className="text-center text-red-500">エラーが発生しました。</p>}

        {skills && (
          <div className="space-y-4">
            <EditableSkillCard title="技術スキル" skills={categorizedSkills['技術スキル']} onDelete={handleDelete} />
            <EditableSkillCard title="役割・経験" skills={categorizedSkills['役割・経験']} onDelete={handleDelete} />
            <EditableSkillCard title="ソフトスキル" skills={categorizedSkills['ソフトスキル']} onDelete={handleDelete} />
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => router.push('/talent/mypage')}
            className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-slate-400"
          >
            {isSaving ? '保存中...' : 'この内容で確定する'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
