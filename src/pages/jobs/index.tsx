import useSWR from 'swr';
import Layout from '@/components/Layout';
import type { Job, Company } from '@prisma/client';
import { BuildingOffice2Icon, MapPinIcon, CurrencyYenIcon, SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { TalentProfileWithRelations } from '../api/talent/profile';
import { FC, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

// APIからの応答の型
type JobWithCompany = Job & { company: { name: string; logoUrl: string | null } };
type SearchApiResponse = {
  jobs: JobWithCompany[];
  skillCounts: { [key: string]: number };
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

const SkillOpportunityCard: React.FC<{
  skillCounts: { [key: string]: number };
  userSkills: string[];
}> = ({ skillCounts, userSkills }) => {
  const opportunities = Object.entries(skillCounts)
    .filter(([skillName, count]) => !userSkills.includes(skillName) && count > 0)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 10);

  if (opportunities.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg border border-yellow-300 bg-yellow-50 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="h-6 w-6 text-yellow-600" />
        <h2 className="text-lg font-bold text-yellow-800">注目のスキル機会</h2>
      </div>
      <p className="text-sm text-yellow-700 mb-4">これらのスキルを習得すると、さらに多くの求人に応募できるようになります。</p>
      <div className="flex flex-wrap gap-3">
        {opportunities.map(([skillName, count]) => (
          <div key={skillName} className="px-3 py-1.5 bg-white border rounded-md text-sm">
            <span className="font-semibold text-slate-800">{skillName}</span>
            <span className="ml-2 text-blue-600 font-bold">{count}件</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 求人カードコンポーネント
const JobCard: React.FC<{ job: JobWithCompany }> = ({ job }) => (
  <div className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-full bg-white border p-1 flex items-center justify-center flex-shrink-0">
  <img
          src={job.company.logoUrl || `https://placehold.co/40x40/e2e8f0/334155?text=${job.company.name.charAt(0)}`}
    alt={`${job.company.name} logo`}
    className="max-h-full max-w-full object-contain"
  />
</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-600">{job.company.name}</p>
        <h3 className="text-lg font-bold text-slate-800">{job.title}</h3>
      </div>
    </div>
    <div className="mt-4 space-y-2 text-sm text-slate-600 flex-grow">
      <div className="flex items-center gap-2">
        <MapPinIcon className="h-4 w-4" />
        <span>{job.location || '未設定'}</span>
      </div>
      <div className="flex items-center gap-2">
        <CurrencyYenIcon className="h-4 w-4" />
        <span>{job.salaryMin ? `${(job.salaryMin / 10000).toLocaleString()}万円` : '応相談'} 〜</span>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
      {job.requiredSkills.map(skill => (
        <span key={skill} className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-md">{skill}</span>
      ))}
    </div>
  </div>
);

export default function JobsPage() {
  // ★ 変更点: フィルター用のstateを追加
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('');

  // ★ 変更点: フィルターの状態に応じてAPIのURLを動的に構築
  const params = new URLSearchParams();
  if (jobTypeFilter) {
    params.append('jobType', jobTypeFilter);
  }
  const apiUrl = `/api/jobs/search?${params.toString()}`;

  const { data: searchData, error: searchError, isLoading: isSearchLoading } = useSWR<SearchApiResponse>(apiUrl, fetcher);
  const { data: profile, isLoading: isProfileLoading } = useSWR<TalentProfileWithRelations | null>('/api/talent/profile', fetcher);

  // ★ 追加: 応募処理中のIDを管理するstate
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const isLoading = isSearchLoading || isProfileLoading;
  const userSkills = profile?.skills.map(s => s.skill.name) || [];

  // ★ 追加: 応募処理を行うハンドラ
  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      const response = await apiClient('/api/talent/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '応募に失敗しました。');
      }
      alert('応募が完了しました！');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/talent/mypage" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            マイページに戻る
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">求人を探す</h1>
        <p className="text-slate-600 mb-8">あなたのスキルに合ったキャリアを見つけましょう。</p>

        {/* ★ 変更点: フィルターUIを追加 */}
        <div className="flex items-center gap-2 mb-8">
          <button onClick={() => setJobTypeFilter('')} className={`px-4 py-2 text-sm rounded-full font-semibold transition-colors ${!jobTypeFilter ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'}`}>すべて</button>
          <button onClick={() => setJobTypeFilter('INTERNSHIP')} className={`px-4 py-2 text-sm rounded-full font-semibold transition-colors ${jobTypeFilter === 'INTERNSHIP' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'}`}>インターンシップ</button>
          <button onClick={() => setJobTypeFilter('FULL_TIME')} className={`px-4 py-2 text-sm rounded-full font-semibold transition-colors ${jobTypeFilter === 'FULL_TIME' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'}`}>正社員</button>
        </div>

        {isLoading && <p>読み込んでいます...</p>}

        {/* ★ 追加: スキル機会カードを表示 */}
        {searchData?.skillCounts && <SkillOpportunityCard skillCounts={searchData.skillCounts} userSkills={userSkills} />}

        <h2 className="text-xl font-bold text-slate-800 my-8">求人一覧</h2>
        {searchError && <p className="text-red-500">求人情報の取得に失敗しました。</p>}

        {searchData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchData.jobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                <JobCard job={job} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
