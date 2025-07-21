// /pages/admin/companies/[id].tsx に記述すべき正しいコード

import { useRouter } from 'next/router';
import useSWR, { useSWRConfig } from 'swr';
import Layout from '@/components/Layout';
import type { Company, SponsorshipTier } from '@prisma/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { apiClient } from '@/lib/apiClient';

const fetcher = (url: string) => apiClient(url);

const sponsorTiers = ['NONE', 'BRONZE', 'SILVER', 'GOLD'];

export default function EditCompanyPage() {
  const router = useRouter();
  const { id } = router.query;
  const { mutate } = useSWRConfig();

  const { data: company, error } = useSWR<Company>(id ? `/api/admin/companies/${id}` : null, fetcher);

  const [tier, setTier] = useState<SponsorshipTier>('NONE');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setTier(company.sponsorshipTier);
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient(`/api/admin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      if (!res.ok) throw new Error('更新に失敗しました。');

      mutate(`/api/admin/companies`);
      alert('スポンサーレベルを更新しました。');
      router.push('/admin');

    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) return <Layout><div>企業が見つかりません。</div></Layout>;
  if (!company) return <Layout><div>読み込み中...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeftIcon className="h-4 w-4" />
            管理者ページに戻る
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{company.name}</h1>
        <p className="text-sm text-slate-500 mb-6">法人番号: {company.corporateNumber}</p>

        <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-lg border">
          <div>
            <label htmlFor="sponsorshipTier" className="block text-sm font-medium text-slate-700">スポンサーレベル</label>
            <select
              id="sponsorshipTier"
              name="sponsorshipTier"
              value={tier}
              onChange={(e) => setTier(e.target.value as SponsorshipTier)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {sponsorTiers.map(tierValue => (
                <option key={tierValue} value={tierValue}>{tierValue}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400">
              {isLoading ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
