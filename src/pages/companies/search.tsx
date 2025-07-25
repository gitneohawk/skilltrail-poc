import { useState } from 'react';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import { SKILL_CANDIDATES } from '@/types/Skills';
import { MultiSelectButtons } from '@/components/forms'; // 以前作成した共通コンポーネント
import { UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/apiClient';

// APIから返ってくるTalentの型
type AnonymizedTalent = {
  id: string;
  desiredJobTitles: string[];
  careerSummary: string | null;
  skills: { skill: { name: string } }[];
  certifications: { certification: { name: string } }[];
};

const fetcher = (url: string) => apiClient(url);

// タレントカードコンポーネント
const TalentCard: React.FC<{ talent: AnonymizedTalent }> = ({ talent }) => (
  <div className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <UserIcon className="h-8 w-8 p-1.5 bg-slate-100 text-slate-500 rounded-full" />
      <h3 className="text-lg font-bold text-slate-800">
        {talent.desiredJobTitles.join(', ') || 'セキュリティ専門家'}
      </h3>
    </div>
    <p className="text-sm text-slate-600 line-clamp-3 mb-4">{talent.careerSummary || '経歴サマリーは未設定です。'}</p>
    <div className="flex flex-wrap gap-2">
      {talent.skills.map(({ skill }) => (
        <span key={skill.name} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md font-semibold">{skill.name}</span>
      ))}
    </div>
  </div>
);

export default function TalentSearchPage() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [internshipOnly, setInternshipOnly] = useState(false);


  // 選択されたスキルに基づいてAPIのURLを動的に構築
const params = new URLSearchParams();
  if (selectedSkills.length > 0) {
    params.append('skills', selectedSkills.join(','));
  }
  if (internshipOnly) {
    params.append('internship', 'true');
  }
  const apiUrl = `/api/companies/talent-search?${params.toString()}`;  const { data: talents, error, isLoading } = useSWR<AnonymizedTalent[]>(apiUrl, fetcher);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">タレントを探す</h1>
        <p className="text-slate-600 mb-8">求めるスキルを持つ人材を見つけましょう。</p>

        {/* スキル検索フィルター */}
        <div className="bg-white p-6 rounded-lg border mb-8">
          <div className="flex items-center gap-2 mb-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold">スキルで絞り込む</h3>
          </div>
          <MultiSelectButtons
            options={SKILL_CANDIDATES}
            selected={selectedSkills}
            onChange={setSelectedSkills}
          />
          <div className="mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={internshipOnly}
                onChange={(e) => setInternshipOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">インターン希望の学生のみ表示</span>
            </label>
          </div>
        </div>

        {/* 検索結果 */}
        {isLoading && <p>検索中...</p>}
        {error && <p className="text-red-500">タレントの検索に失敗しました。</p>}

        {talents && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {talents.length > 0 ? (
              talents.map(talent => <TalentCard key={talent.id} talent={talent} />)
            ) : (
              <p className="text-slate-500 md:col-span-2">条件に一致するタレントは見つかりませんでした。</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
