// pages/admin/index.tsx

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import useSWR, { useSWRConfig } from 'swr';
import Layout from '@/components/Layout';
import type { Company, ApprovedEmail } from '@prisma/client';
import {
  ShieldCheckIcon, EnvelopeIcon, TrashIcon, UsersIcon, BuildingOffice2Icon, DocumentTextIcon
} from '@heroicons/react/24/solid';
import { useState, FC } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';

// ★★★ 2. fetcherをapiClientを使うように修正 ★★★
const fetcher = (url: string) => apiClient(url);

// 統計表示用カードコンポーネント
const StatCard: FC<{ title: string; value: number | undefined; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-4 border">
    <div className="bg-white p-3 rounded-full border shadow-sm">
      <Icon className="h-6 w-6 text-slate-500" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value ?? '...'}</p>
    </div>
  </div>
);

// メールアドレス追加フォームコンポーネント
const AddEmailForm: FC = () => {
  const { mutate } = useSWRConfig();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      // ★★★ 3. fetchをapiClientに置き換え ★★★
      await apiClient('/api/admin/approved-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEmail('');
      mutate('/api/admin/approved-emails');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="許可するメールアドレス"
        required
        className="flex-grow px-3 py-2 border border-slate-300 rounded-md"
      />
      <button type="submit" disabled={isLoading} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400">
        <EnvelopeIcon className="h-5 w-5" />
      </button>
    </form>
  );
};


export default function AdminDashboard() {
  // ★★★ 修正点: routerの宣言をuseSessionの前に移動し、重複を解消 ★★★
  const router = useRouter();

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // 未認証の場合、サインインページにリダイレクトする
      router.push('/api/auth/signin');
    },
  });
  // ★★★ ここまで修正 ★★★

  const { mutate } = useSWRConfig();

  // APIから各種データを取得
  const { data: companies, error: companiesError, isLoading: isCompaniesLoading } = useSWR<Company[]>('/api/admin/companies', fetcher);
  const { data: approvedEmails, error: emailsError, isLoading: isEmailsLoading } = useSWR<ApprovedEmail[]>('/api/admin/approved-emails', fetcher);
  const { data: stats, error: statsError, isLoading: isStatsLoading } = useSWR<{talentCount: number, companyCount: number, jobCount: number}>('/api/admin/stats', fetcher);

  const handleDeleteEmail = async (id: string) => {
    // window.confirmはapiClientの処理をブロックしてしまう可能性があるため、
    // 先に確認を行うのが安全です。
    if (!window.confirm('このメールアドレスを削除しますか？')) return;
    try {
      // ★★★ 4. fetchをapiClientに置き換え ★★★
      await apiClient('/api/admin/approved-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      mutate('/api/admin/approved-emails');
    } catch (error) {
      alert((error as Error).message);
    }
  };

  // required: true を使っているので、statusは 'loading' か 'authenticated' のどちらかになる
  if (status === 'loading') {
    return <Layout><p className="text-center p-8">読み込み中...</p></Layout>;
  }

  // ★★★ 修正点: 認証後のロールチェックのみを行う ★★★
  if (session?.user?.role !== 'ADMIN') {
    return <Layout><p className="text-center p-8 text-red-600">管理者権限がありません。</p></Layout>;
  }

  const isLoading = isCompaniesLoading || isEmailsLoading || isStatsLoading;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">運営者管理ページ</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="登録タレント数" value={stats?.talentCount} icon={UsersIcon} />
          <StatCard title="登録企業数" value={stats?.companyCount} icon={BuildingOffice2Icon} />
          <StatCard title="公開中の求人数" value={stats?.jobCount} icon={DocumentTextIcon} />
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">利用申請の承認管理</h2>
          <AddEmailForm />
          <div className="mt-4 max-h-60 overflow-y-auto">
            <ul className="divide-y divide-slate-200">
              {emailsError && <p className="text-xs text-red-500">リストの読み込みに失敗</p>}
              {isEmailsLoading && <p className="text-xs text-slate-500">読み込み中...</p>}
              {approvedEmails?.map(item => (
                <li key={item.id} className="py-2 flex justify-between items-center">
                  <span className="text-sm text-slate-700">{item.email}</span>
                  <button onClick={() => handleDeleteEmail(item.id)} className="text-slate-400 hover:text-red-500">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">登録企業一覧</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">会社名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">法人番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">スポンサーレベル</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isCompaniesLoading && <tr><td colSpan={4} className="p-4 text-center text-sm text-slate-500">読み込み中...</td></tr>}
                {companiesError && <tr><td colSpan={4} className="p-4 text-center text-red-500">企業の読み込みに失敗しました。</td></tr>}
                {companies?.map(company => (
                  <tr key={company.corporateNumber}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{company.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{company.corporateNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{company.sponsorshipTier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/companies/${company.corporateNumber}`} className="text-blue-600 hover:text-blue-800">
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
