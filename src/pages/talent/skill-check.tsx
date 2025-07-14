// /pages/talent/skill-check.tsx

import useSWR from 'swr';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import type { AiExtractedSkill } from '@prisma/client';
import { TagIcon, CpuChipIcon } from '@heroicons/react/24/solid';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const SkillCard: React.FC<{ title: string; skills: AiExtractedSkill[] }> = ({ title, skills }) => (
  <div className="bg-white p-6 rounded-lg border">
    <h3 className="text-md font-semibold text-slate-700 mb-3">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {skills.map(skill => (
        <span key={skill.id} className="px-3 py-1 text-sm bg-slate-100 text-slate-800 rounded-full">
          {skill.skillName}
        </span>
      ))}
    </div>
  </div>
);

export default function SkillCheckPage() {
  const router = useRouter();
  const { data: skills, error, isLoading } = useSWR<AiExtractedSkill[]>('/api/talent/ai-extracted-skills', fetcher);

  const categorizedSkills = {
    '技術スキル': skills?.filter(s => s.category === '技術スキル') || [],
    '役割・経験': skills?.filter(s => s.category === '役割・経験') || [],
    'ソフトスキル': skills?.filter(s => s.category === 'ソフトスキル') || [],
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <CpuChipIcon className="h-12 w-12 mx-auto text-blue-500" />
          <h1 className="text-2xl font-bold mt-4 text-slate-800">AIによるスキル分析結果</h1>
          <p className="mt-2 text-sm text-slate-600">
            インタビュー内容から、AIはあなたの能力をこのように理解しました。
            <br />
            この内容は、今後のAI診断の精度向上のために利用されます。
          </p>
        </div>

        {isLoading && <p className="text-center">分析結果を読み込んでいます...</p>}
        {error && <p className="text-center text-red-500">エラーが発生しました。</p>}

        {skills && (
          <div className="space-y-4">
            <SkillCard title="技術スキル" skills={categorizedSkills['技術スキル']} />
            <SkillCard title="役割・経験" skills={categorizedSkills['役割・経験']} />
            <SkillCard title="ソフトスキル" skills={categorizedSkills['ソフトスキル']} />
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/talent/mypage')}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            マイページへ戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
