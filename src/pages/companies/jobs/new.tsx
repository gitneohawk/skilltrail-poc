import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { SKILL_CANDIDATES } from '@/types/Skills'; // Talentプロフィールで使ったスキルリストを再利用
import { FormRow, MultiSelectButtons } from '@/components/forms';

type JobFormData = {
  title: string;
  description: string;
  employmentType: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  requiredSkills: string[];
};

export default function NewJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    employmentType: 'FULL_TIME', // デフォルトを正社員に設定
    location: '',
    salaryMin: '',
    salaryMax: '',
    requiredSkills: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setFormData(prev => ({ ...prev, requiredSkills: skills }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/companies/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('求人の作成に失敗しました。');
      alert('求人が作成されました！');
      router.push('/companies/mypage');
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">新規求人の作成</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg border">
          <FormRow label="求人タイトル" required>
            <input name="title" value={formData.title} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
          </FormRow>
          <FormRow label="求人詳細" required>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={8} className="w-full px-3 py-2 border rounded-md" />
          </FormRow>
          <FormRow label="雇用形態">
  <select
    name="employmentType"
    value={formData.employmentType}
    onChange={handleChange}
    className="w-full px-3 py-2 border rounded-md bg-white"
  >
    <option value="FULL_TIME">正社員</option>
    <option value="INTERNSHIP">インターンシップ</option>
    <option value="CONTRACT">契約社員</option>
  </select>
</FormRow>
          <FormRow label="勤務地">
            <input name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          </FormRow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormRow label="下限年収（円）">
              <input name="salaryMin" type="text" value={formData.salaryMin} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="例: 6000000" />
            </FormRow>
            <FormRow label="上限年収（円）">
              <input name="salaryMax" type="text" value={formData.salaryMax} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="例: 9000000" />
            </FormRow>
          </div>
           <FormRow label="必須スキル">
             <MultiSelectButtons options={SKILL_CANDIDATES} selected={formData.requiredSkills} onChange={handleSkillsChange} />
           </FormRow>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => router.push('/companies/mypage')} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-md hover:bg-slate-50">
              キャンセル
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400">
              {isLoading ? '保存中...' : '求人を保存する'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
