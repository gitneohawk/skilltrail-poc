// pages/company/mypage.tsx

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import type { CompanyProfile } from '@/types/CompanyProfile';
import { BuildingOffice2Icon, PencilSquareIcon, UserPlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

// 表示用の行コンポーネント
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-slate-600">{label}</dt>
        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{value || '未設定'}</dd>
    </div>
);

// セクションコンポーネント
const DashboardSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }> = ({ title, icon: Icon, children, action }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 text-slate-500" />
                <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            </div>
            {action}
        </div>
        <div className="mt-4">{children}</div>
    </div>
);

// 本社所在地の表示を整形するヘルパー関数
const formatHeadquarters = (hq: any): string => {
    if (!hq) return '未設定';
    if (typeof hq === 'string') {
        return hq;
    }
    // オブジェクトの場合、文字列に変換
    if (typeof hq === 'object') {
        return `${hq.country || ''} ${hq.region || ''} ${hq.city || ''}`.trim() || '未設定';
    }
    return '未設定';
};


const CompanyMypage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: 将来的にAPIから求人情報を取得する
  const [jobs, setJobs] = useState([
    { id: 1, title: 'シニアセキュリティエンジニア (SOC)', status: '公開中' },
    { id: 2, title: 'プロダクトセキュリティ専門家', status: '下書き' },
  ]);

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchProfile = async () => {
        setIsLoading(true);
        const response = await fetch('/api/company/profile', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      };
      fetchProfile();
    }
    if (status === 'unauthenticated') {
      router.push('/company'); // ログインしていなければ玄関ページへ
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return <Layout><p className="text-center p-8">Loading...</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-slate-800">企業マイページ</h1>

        {profile ? (
          <>
            {/* 企業プロフィールセクション */}
            <DashboardSection
              title="企業プロフィール"
              icon={BuildingOffice2Icon}
              action={
                <button
                  onClick={() => router.push('/company/profile')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  編集する
                </button>
              }
            >
              <dl className="divide-y divide-slate-200">
                <InfoRow label="会社名" value={profile.name} />
                <InfoRow label="本社所在地" value={formatHeadquarters(profile.headquarters)} />
                <InfoRow label="事業内容" value={<p className="whitespace-pre-wrap">{profile.description}</p>} />
                <InfoRow label="公式サイト" value={profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.website}</a> : '未設定'} />
              </dl>
            </DashboardSection>

            {/* 求人情報セクション */}
            <DashboardSection
              title="求人情報"
              icon={DocumentTextIcon}
              action={
                <button
                  onClick={() => router.push('/company/jobs/new')} // TODO: 新規作成ページへのリンク
                  className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-semibold px-3 py-1.5 rounded-md"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  新規求人を作成
                </button>
              }
            >
              <div className="flow-root">
                <ul role="list" className="divide-y divide-slate-200">
                  {jobs.map((job) => (
                    <li key={job.id} className="py-4 flex justify-between items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                        <p className="text-sm text-slate-500">
                          ステータス:
                          <span className={job.status === '公開中' ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                            {job.status}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/company/jobs/${job.id}`)} // TODO: 編集ページへのリンク
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        編集
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </DashboardSection>

            {/* メンバー管理セクション (将来の実装用) */}
            <DashboardSection
              title="メンバー管理"
              icon={UserPlusIcon}
              action={
                <button
                  disabled // TODO: 将来的に有効化
                  className="flex items-center gap-2 text-sm text-blue-600 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  メンバーを招待
                </button>
              }
            >
              <p className="text-sm text-slate-500">現在、この機能は準備中です。ここでは、あなたの会社の他の担当者を招待し、共同でプロフィールを管理できるようになります。</p>
            </DashboardSection>
          </>
        ) : (
          // プロフィールがまだない場合の表示
          <div className="text-center bg-white p-12 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">ようこそ、skilltrailへ！</h2>
            <p className="text-slate-600 mb-6">
              まずは、候補者にアピールするための企業プロフィールを登録しましょう。
            </p>
            <button
              onClick={() => router.push('/company/profile')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              プロフィールを登録する
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyMypage;
