// pages/companies/mypage.tsx

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr'; // ★ 追加
import Layout from '@/components/Layout';
import type { CompanyProfile } from '@/types/CompanyProfile';
import type { Job } from '@prisma/client'; // ★ 追加
import Link from 'next/link';
import { apiClient } from '../../lib/apiClient';

import {
  BuildingOffice2Icon,
  PencilSquareIcon,
  UserPlusIcon,
  DocumentTextIcon,
  UserCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

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
const fetcher = (url: string) => apiClient(url, { credentials: 'include' });


const CompanyMypage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // ★ 変更: ハードコードされたjobsを削除し、SWRでAPIから取得
  const { data: jobs, isLoading: isJobsLoading } = useSWR<Job[]>(
    status === 'authenticated' ? '/api/companies/jobs' : null,
    fetcher
  );

  useEffect(() => {
    if (status === 'authenticated') {
      setIsProfileLoading(true);
      apiClient('/api/companies/profile', { credentials: 'include' }).then(res => res.ok ? res.json() : null)
        .then(data => setProfile(data))
        .finally(() => setIsProfileLoading(false));
    }
    if (status === 'unauthenticated') {
      // ★ 変更: パスを/companiesに
      router.push('/companies');
    }
  }, [status, router]);

  const isLoading = status === 'loading' || isProfileLoading || isJobsLoading;
  if (isLoading) {
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
                  // ★ 変更: パスを/companiesに
                  onClick={() => router.push('/companies/profile')}
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
              </dl>
            </DashboardSection>

            {/* ▼▼▼ 担当者情報セクションを追加 ▼▼▼ */}
            <DashboardSection
              title="通知先担当者"
              icon={UserCircleIcon}
              action={
                <button
                  // ★ 変更: パスを/companiesに
                  onClick={() => router.push('/companies/profile')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  編集する
                </button>
              }
            >
              <dl className="divide-y divide-slate-200">
                <InfoRow label="担当者名" value={profile.contact?.name} />
                <InfoRow label="メールアドレス" value={profile.contact?.email} />
                <InfoRow label="電話番号" value={profile.contact?.phone} />
              </dl>
            </DashboardSection>

            <DashboardSection
              title="タレント検索"
              icon={MagnifyingGlassIcon}
              action={
                <button
                  onClick={() => router.push('/companies/search')}
                  className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-semibold px-3 py-1.5 rounded-md"
                >
                  検索ページへ
                </button>
              }
            >
              <p className="text-sm text-slate-500">スキルや経験を元に、登録しているタレントを検索できます。</p>
            </DashboardSection>

            {/* 求人情報セクション */}
            <DashboardSection
              title="求人情報"
              icon={DocumentTextIcon}
              action={
                <button
                  // ★ 変更: パスを/companiesに
                  onClick={() => router.push('/companies/jobs/new')}
                  className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-semibold px-3 py-1.5 rounded-md"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  新規求人を作成
                </button>
              }
            >
              <div className="flow-root">
                {/* ★ 変更: APIから取得したjobsをmapする */}
                {(jobs && jobs.length > 0) ? (
                <ul role="list" className="divide-y divide-slate-200">
                  {jobs.map((job) => (
                    <li key={job.id} className="py-4 flex justify-between items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                        <p className="text-sm text-slate-500">
                          ステータス:
                            <span className={job.status === 'PUBLISHED' ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                              {job.status === 'PUBLISHED' ? '公開中' : '下書き'}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Link href={`/companies/jobs/${job.id}/applicants`} className="text-sm text-green-600 hover:text-green-800 font-semibold">
                          応募者を見る
                        </Link>
                        <Link href={`/companies/jobs/${job.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
                          編集
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                ) : (
                  <p className="text-center text-sm text-slate-500 py-4">まだ求人はありません。</p>
                )}
              </div>
            </DashboardSection>

            {/* メンバー管理セクション */}
            <DashboardSection
              title="メンバー管理"
              icon={UserPlusIcon}
              action={
                <button disabled className="flex items-center gap-2 text-sm text-blue-600 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed">
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
              // ★ 変更: パスを/companiesに
              onClick={() => router.push('/companies/profile')}
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
