import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import type { Job, Company } from '@prisma/client';
import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Spinner } from '@/components/Spinner';
import { apiClient } from '../../lib/apiClient';

const fetcher = (url: string) => apiClient(url);

type JobDetails = Job & { company: Partial<Company> };

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: job, error } = useSWR<JobDetails>(id ? `/api/jobs/${id}` : null, fetcher);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async (jobId: string) => {
    setIsApplying(true);
    try {
      const response = await apiClient('/api/talent/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '応募に失敗しました。');
      alert('応募が完了しました！');
      router.push('/talent/mypage');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  if (error) return <Layout><div><p className="text-center p-8">求人が見つかりません。</p></div></Layout>;
  if (!job) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeftIcon className="h-4 w-4" />
            求人一覧に戻る
          </Link>
        </div>

        <div className="bg-white p-8 rounded-lg border">
          <div className="flex items-start gap-4 mb-6">
<div className="h-16 w-16 rounded-lg bg-white border p-2 flex items-center justify-center">
  <img
    src={job.company.logoUrl || `https://placehold.co/64x64/e2e8f0/334155?text=${job.company.name?.charAt(0)}`}
    alt={`${job.company.name} logo`}
    className="max-h-full max-w-full object-contain"
  />
</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{job.title}</h1>
<Link href={`/companies/${job.companyId}`} className="text-md text-slate-600 hover:underline hover:text-blue-600">
    {job.company.name}
  </Link>            </div>
          </div>
           <div className="my-6 space-y-4 border-y py-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">勤務地</dt>
                <dd className="mt-1 text-sm text-slate-900">{job.location || '未設定'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">雇用形態</dt>
                <dd className="mt-1 text-sm text-slate-900">{job.employmentType || '未設定'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">給与レンジ</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {job.salaryMin?.toLocaleString()}円 〜 {job.salaryMax?.toLocaleString()}円
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">必須スキル</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {job.requiredSkills.map(skill => (
                    <span key={skill} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 font-semibold rounded-full">{skill}</span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="prose prose-slate max-w-none">
            <ReactMarkdown>{job.description}</ReactMarkdown>
          </div>

          <div className="mt-8 pt-6 border-t">
            <button
              onClick={() => handleApply(job.id)}
              disabled={isApplying}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
            >
              {isApplying ? '処理中...' : 'この求人に応募する'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
