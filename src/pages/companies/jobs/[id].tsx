import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import { SKILL_CANDIDATES } from '@/types/Skills';
import type { Job } from '@prisma/client';
import { FormRow, MultiSelectButtons } from '@/components/forms';

const fetcher = (url: string) => fetch(url).then(res => { if (!res.ok) throw new Error('Not found'); return res.json(); });

export default function EditJobPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data: job, error } = useSWR<Job>(id ? `/api/companies/jobs/${id}` : null, fetcher);

  const [formData, setFormData] = useState({
    title: '', description: '', employmentType: '', location: '',
    salaryMin: '', salaryMax: '', requiredSkills: [] as string[], status: 'DRAFT',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title,
        description: job.description,
        employmentType: job.employmentType || '',
        location: job.location || '',
        salaryMin: job.salaryMin?.toString() || '',
        salaryMax: job.salaryMax?.toString() || '',
        requiredSkills: job.requiredSkills || [],
        status: job.status,
      });
    }
  }, [job]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('求人の更新に失敗しました。');
      alert('求人が更新されました！');
      router.push('/companies/mypage');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('本当にこの求人を削除しますか？')) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/jobs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('求人の削除に失敗しました。');
      alert('求人を削除しました。');
      router.push('/companies/mypage');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  if (error) return <Layout><div>求人が見つかりません。</div></Layout>
  if (!job) return <Layout><div>Loading...</div></Layout>

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">求人情報の編集</h1>
        <form onSubmit={handleUpdate} className="space-y-6 bg-white p-8 rounded-lg border">
          <FormRow label="求人タイトル" required><input name="title" value={formData.title} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" /></FormRow>
          <FormRow label="求人詳細" required><textarea name="description" value={formData.description} onChange={handleChange} required rows={8} className="w-full px-3 py-2 border rounded-md" /></FormRow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormRow label="雇用形態"><input name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></FormRow>
            <FormRow label="ステータス"><select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white"><option value="DRAFT">下書き</option><option value="PUBLISHED">公開中</option></select></FormRow>
          </div>
          <FormRow label="勤務地"><input name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></FormRow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormRow label="下限年収（円）"><input name="salaryMin" type="number" value={formData.salaryMin} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="例: 6000000" /></FormRow>
            <FormRow label="上限年収（円）"><input name="salaryMax" type="number" value={formData.salaryMax} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="例: 9000000" /></FormRow>
          </div>
          <FormRow label="必須スキル"><MultiSelectButtons options={SKILL_CANDIDATES} selected={formData.requiredSkills} onChange={(skills) => setFormData(prev => ({ ...prev, requiredSkills: skills }))} /></FormRow>
          <div className="flex justify-between items-center pt-4">
            <button type="button" onClick={handleDelete} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50">
              削除する
            </button>
            <div className="flex gap-4">
              <button type="button" onClick={() => router.push('/companies/mypage')} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-md hover:bg-slate-50">キャンセル</button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400">{isLoading ? '保存中...' : '変更を保存する'}</button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
