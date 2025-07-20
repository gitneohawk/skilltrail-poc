import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import type { Application, TalentProfile, Skill, TalentSkill } from '@prisma/client';
import Link from 'next/link';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../../../lib/apiClient';

const fetcher = (url: string) => apiClient(url);

type Applicant = Application & {
  talent: {
    id: string;
    desiredJobTitles: string[];
    skills: (TalentSkill & { skill: Skill })[];
  }
};

export default function ApplicantsPage() {
  const router = useRouter();
  const { id: jobId } = router.query;
  const { data: applicants, error } = useSWR<Applicant[]>(jobId ? `/api/companies/jobs/${jobId}/applicants` : null, fetcher);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/companies/mypage" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeftIcon className="h-4 w-4" />
            企業マイページに戻る
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">応募者一覧</h1>

        <div className="bg-white rounded-lg border">
          <ul role="list" className="divide-y divide-slate-200">
            {error && <li className="p-4 text-red-500">応募者の読み込みに失敗しました。</li>}
            {!applicants && !error && <li className="p-4 text-slate-500">読み込み中...</li>}
            {applicants?.length === 0 && <li className="p-4 text-slate-500">この求人への応募者はまだいません。</li>}

            {applicants?.map(app => (
              <li key={app.id} className="p-4 sm:p-6 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <UserIcon className="h-10 w-10 p-2 bg-slate-100 text-slate-500 rounded-full" />
                    <div>
                      <p className="font-semibold text-slate-800">{app.talent.desiredJobTitles.join(' / ') || 'タレント'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {app.talent.skills.slice(0, 5).map(({ skill }) => (
                          <span key={skill.name} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">{skill.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                    {app.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
