import useSWR from 'swr';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import type { Job, Company, TalentProfile } from '@prisma/client';
import { BuildingOffice2Icon, MapPinIcon, CurrencyYenIcon, SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { TalentProfileWithRelations } from '../api/talent/profile'; // 型をインポート
import Link from 'next/link'; // ← Link を追加


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
    .sort(([, countA], [, countB]) => countB - countA) // 件数が多い順
    .slice(0, 10); // 上位10件に絞る

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
  <div className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
    <div className="flex items-start gap-4">
      <img
        src={job.company.logoUrl || `https://placehold.co/40x40/e2e8f0/334155?text=${job.company.name.charAt(0)}`}
        alt={`${job.company.name} logo`}
        className="h-10 w-10 rounded-full object-contain bg-white border flex-shrink-0"
      />
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-600">{job.company.name}</p>
        <h3 className="text-lg font-bold text-slate-800">{job.title}</h3>
      </div>
    </div>
    <div className="mt-4 space-y-2 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <MapPinIcon className="h-4 w-4" />
        <span>{job.location || '未設定'}</span>
      </div>
      <div className="flex items-center gap-2">
        <CurrencyYenIcon className="h-4 w-4" />
        <span>{job.salaryMin ? `${(job.salaryMin / 10000).toLocaleString()}万円` : '応相談'} 〜</span>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {job.requiredSkills.map(skill => (
        <span key={skill} className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-md">{skill}</span>
      ))}
    </div>
  </div>
);

export default function JobsPage() {
  // 求人一覧とスキルごとの件数を取得
  const { data: searchData, error: searchError, isLoading: isSearchLoading } = useSWR<SearchApiResponse>('/api/jobs/search', fetcher);

  // ★ 追加: ログインユーザーのプロフィール（とスキル）を取得
  const { data: profile, isLoading: isProfileLoading } = useSWR<TalentProfileWithRelations | null>('/api/talent/profile', fetcher);

  const isLoading = isSearchLoading || isProfileLoading;
  const userSkills = profile?.skills.map(s => s.skill.name) || [];

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

        {isLoading && <p>読み込んでいます...</p>}

        {/* ★ 追加: スキル機会カードを表示 */}
        {searchData?.skillCounts && <SkillOpportunityCard skillCounts={searchData.skillCounts} userSkills={userSkills} />}

        <h2 className="text-xl font-bold text-slate-800 mb-4">新着の求人</h2>
        {searchError && <p className="text-red-500">求人情報の取得に失敗しました。</p>}

        {searchData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchData.jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
