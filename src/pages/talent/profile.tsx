// pages/talent/profile.tsx (最終修正版)

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import type { TalentProfile, TalentType } from '@prisma/client'; // ★ TalentTypeをインポート
import { SKILL_CANDIDATES } from '@/types/Skills';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { TalentProfileWithRelations } from '../api/talent/profile';
import { FormRow, MultiSelectButtons } from '@/components/forms';

// --- 定数データ ---
const jobTitles: string[] = ['SOCアナリスト','CSIRTエンジニア','セキュリティコンサルタント','セキュリティアーキテクト','脆弱性診断エンジニア','GRC担当','セキュリティエンジニア（インフラ系）','セキュリティエンジニア（アプリ系）'];
const certificationsList: string[] = ['CISSP','CISA','CISM','CEH','CompTIA Security+','CompTIA CySA+','AWS Certified Security','Microsoft SC-100','Microsoft SC-200','Azure Security Engineer'];

// フォームで管理するデータの型
type ProfileFormData = Partial<Omit<TalentProfile, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>;

// --- ヘルパーコンポーネント ---
const SectionHeader: React.FC<{ title: string; isOpen: boolean; onClick: () => void }> = ({ title, isOpen, onClick }) => ( <button type="button" className="w-full bg-slate-100 p-4 rounded-lg cursor-pointer flex justify-between items-center text-left" onClick={onClick}> <h2 className="text-lg font-semibold text-slate-800">{title}</h2> {isOpen ? <ChevronUpIcon className="h-6 w-6 text-slate-500" /> : <ChevronDownIcon className="h-6 w-6 text-slate-500" />} </button> );

// ★ 追加: トグルスイッチコンポーネント
const ToggleSwitch: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium text-slate-800">{label}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    <button
      type="button"
      className={`${enabled ? 'bg-blue-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      onClick={() => onChange(!enabled)}
    >
      <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
  </div>
);


const TalentProfilePage = () => {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileFormData>({ fullName: session?.user?.name || '', talentType: 'PROFESSIONAL' });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  const [openSection, setOpenSection] = useState<string>('basicInfo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : null);
  const { data: initialData, isLoading: isDataLoading } = useSWR<TalentProfileWithRelations | null>(
    authStatus === "authenticated" ? `/api/talent/profile` : null,
    fetcher
  );

  useEffect(() => {
    if (initialData) {
      const { skills, certifications, ...restOfProfile } = initialData;
      setProfile(restOfProfile);
      setSelectedSkills(skills.map(s => s.skill.name));
      setSelectedCerts(certifications.map(c => c.certification.name));
    }
  }, [initialData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = type === 'checkbox' ? e.target.checked : undefined;

    let finalValue: any = value;
    if (type === 'checkbox') {
      finalValue = checked;
    } else if (type === 'number') {
      finalValue = value === '' ? null : parseInt(value, 10);
    }
    setProfile(p => ({ ...p, [name]: finalValue }));
  };

  const handleMultiSelectChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, newSelection: string[]) => {
    setter(newSelection);
  };

  const handleTalentTypeChange = (type: TalentType) => {
    setProfile(p => ({...p, talentType: type}))
  }

  const searchAddress = async () => { /* ... */ };

  const handleToggleChange = (fieldName: 'isPublic' | 'allowScouting', enabled: boolean) => {
    setProfile(p => ({ ...p, [fieldName]: enabled }));
  };

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setErrors({});

  if (!profile.fullName?.trim()) {
    setErrors({ fullName: '氏名は必須項目です。' });
    setOpenSection('basicInfo');
    setIsSubmitting(false);
    return;
  }

  try {
    const payload = {
      ...profile,
      skills: selectedSkills,
      certifications: selectedCerts,
    };

    // ★ 変更点: 学生でない場合、学校関連のデータをnullにしてから送信
    if (payload.talentType !== 'STUDENT') {
      payload.schoolName = null;
      payload.graduationYear = null;
      payload.wantsInternship = null;
    }
    if (payload.needsCareerSuggestion) {
      payload.desiredJobTitles = [];
      payload.otherDesiredJobTitle = null;
    }

    const response = await fetch('/api/talent/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || '保存に失敗しました。');
    }
    alert('プロフィールが保存されました');
    router.push('/talent/mypage');
  } catch (err: any) {
    setErrors({ form: err.message });
  } finally {
    setIsSubmitting(false);
  }
};

  const isLoading = authStatus === 'loading' || isDataLoading;
  if (isLoading) return <Layout><div>Loading...</div></Layout>;
  if (authStatus !== 'authenticated') return <Layout><div>このページにアクセスするにはサインインが必要です。</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">プロフィール編集</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
  <SectionHeader title="1. 基本情報" isOpen={openSection === 'basicInfo'} onClick={() => setOpenSection(openSection === 'basicInfo' ? '' : 'basicInfo')} />
  {openSection === 'basicInfo' && (
    <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
      <FormRow label="区分" required>
        <div className="flex rounded-md shadow-sm">
          <button type="button" onClick={() => handleTalentTypeChange('PROFESSIONAL')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md border border-slate-300 w-full transition-colors ${profile.talentType === 'PROFESSIONAL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            社会人
          </button>
          <button type="button" onClick={() => handleTalentTypeChange('STUDENT')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md border border-slate-300 border-l-0 w-full transition-colors ${profile.talentType === 'STUDENT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            学生
          </button>
        </div>
      </FormRow>

      {/* ★ 変更点: 学生の場合のみ表示する項目 */}
      {profile.talentType === 'STUDENT' && (
        <>
          <FormRow label="学校名">
            <input name="schoolName" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.schoolName || ''} onChange={handleChange} />
          </FormRow>
          <FormRow label="卒業予定年度">
            <input name="graduationYear" type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.graduationYear ?? ''} onChange={handleChange} placeholder="例: 2026" />
          </FormRow>
          <FormRow label="インターンシップ">
      <div className="mt-2 flex items-center">
        <input
          id="wantsInternship"
          name="wantsInternship"
          type="checkbox"
          checked={profile.wantsInternship ?? false}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="wantsInternship" className="ml-2 block text-sm text-gray-900">
          インターンを希望する
        </label>
      </div>
    </FormRow>
        </>
      )}

      <FormRow label="氏名" required>
        <input name="fullName" type="text" className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md ${errors.fullName ? 'border-red-500' : 'border-slate-300'}`} value={profile.fullName || ''} onChange={handleChange} />
        {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
      </FormRow>
      <FormRow label="年齢"><input name="age" type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.age ?? ''} onChange={handleChange} /></FormRow>
      <FormRow label="郵便番号">
         <div className="flex gap-2">
           <input name="postalCode" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" maxLength={7} value={profile.postalCode || ''} onChange={handleChange} />
           <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={searchAddress}>住所検索</button>
         </div>
      </FormRow>
      <FormRow label="都道府県"><input name="prefecture" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.prefecture || ''} onChange={handleChange} /></FormRow>
      <FormRow label="市区町村"><input name="city" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.city || ''} onChange={handleChange} /></FormRow>
      <FormRow label="以降の住所"><input name="addressDetail" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.addressDetail || ''} onChange={handleChange} /></FormRow>
    </div>
  )}
</div>
          <div className="space-y-1">
            <SectionHeader title="2. 希望キャリア" isOpen={openSection === 'career'} onClick={() => setOpenSection(openSection === 'career' ? '' : 'career')} />
            {openSection === 'career' && (
               <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
                  <FormRow label="希望職種"><MultiSelectButtons options={jobTitles} selected={profile.desiredJobTitles || []} onChange={sel => setProfile(p => ({ ...p, desiredJobTitles: sel }))} /></FormRow>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="needsCareerSuggestion"
                        name="needsCareerSuggestion"
                        type="checkbox"
                        checked={profile.needsCareerSuggestion ?? false}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">希望キャリアは未定（AIからの提案を希望）</span>
                    </label>
                  </div>
                  <FormRow label="その他希望職種"><input name="otherDesiredJobTitle" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.otherDesiredJobTitle || ''} onChange={handleChange} /></FormRow>
               </div>
            )}
          </div>

          <div className="space-y-1">
             <SectionHeader title="3. スキル・資格" isOpen={openSection === 'skills'} onClick={() => setOpenSection(openSection === 'skills' ? '' : 'skills')} />
             {openSection === 'skills' && (
                <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
                   <FormRow label="保有スキル (セキュリティ関連)">
                     <MultiSelectButtons options={SKILL_CANDIDATES} selected={selectedSkills} onChange={sel => handleMultiSelectChange(setSelectedSkills, sel)} />
                   </FormRow>
                   <FormRow label="保有資格">
                     <MultiSelectButtons options={certificationsList} selected={selectedCerts} onChange={sel => handleMultiSelectChange(setSelectedCerts, sel)} />
                   </FormRow>
                   <FormRow label="その他保有資格"><input name="certificationsOther" type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={profile.certificationsOther || ''} onChange={handleChange} /></FormRow>
                </div>
             )}
          </div>
                    <div className="space-y-1">
             <SectionHeader title="4. 公開設定" isOpen={openSection === 'settings'} onClick={() => setOpenSection(openSection === 'settings' ? '' : 'settings')} />
             {openSection === 'settings' && (
                <div className="p-6 border rounded-b-lg bg-white space-y-6 shadow-sm">
                   <ToggleSwitch
                     label="プロフィールを公開する"
                     description="公開すると、企業があなたの匿名プロフィールを閲覧できるようになります。"
                     enabled={profile.isPublic ?? false}
                     onChange={(enabled) => handleToggleChange('isPublic', enabled)}
                   />
                   <ToggleSwitch
                     label="スカウトを受け付ける"
                     description="企業からのスカウトメッセージの受信を許可します。"
                     enabled={profile.allowScouting ?? false}
                     onChange={(enabled) => handleToggleChange('allowScouting', enabled)}
                   />
                </div>
             )}
          </div>

          <div className="pt-5">
            <div className="flex justify-end gap-3">
              <button type="button" className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => router.push('/talent/mypage')}>キャンセル</button>
              <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
                {isSubmitting ? '保存中...' : 'プロフィールを保存'}
              </button>
            </div>
            {errors.form && <p className="text-red-500 text-sm mt-2 text-right">{errors.form}</p>}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TalentProfilePage;
