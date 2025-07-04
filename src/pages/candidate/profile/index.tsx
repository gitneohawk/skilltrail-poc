import React, { useState, useEffect, ReactNode } from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { CandidateProfile } from '@/types/CandidateProfile';
import { z } from 'zod';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { SKILL_CANDIDATES } from '@/types/Skills';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// --- 定数データ ---
const prefectures: string[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];
const jobTitles: string[] = ['SOCアナリスト','CSIRTエンジニア','セキュリティコンサルタント','セキュリティアーキテクト','脆弱性診断エンジニア','GRC担当','セキュリティエンジニア（インフラ系）','セキュリティエンジニア（アプリ系）'];
const certificationsList: string[] = ['CISSP','CISA','CISM','CEH','CompTIA Security+','CompTIA CySA+','AWS Certified Security','Microsoft SC-100','Microsoft SC-200','Azure Security Engineer'];
const initialProfile: CandidateProfile = {
  basicInfo: { fullName: '', age: 20, gender: '', address: { prefecture: '', city: '', postalCode: '', detail: '' }, contact: { email: '', phone: '' }, workLocationPreferences: [], remoteWorkPreference: { type: 'Onsite', hybridDaysOnsite: 0 } },
  careerPreferences: { desiredJobTitles: [], otherDesiredJobTitle: '', hybridPreference: { mode: '週2日出社', onSiteDays: 0 }, preferredStartTime: 'できるだけ早く' },
  certifications: [], certificationsOther: '', experience: {}, technicalSkills: {}, languageSkills: {}, softSkills: [], mobilityFlexibility: {}, privacySettings: { profileVisibility: 'Public', allowScouting: true }, careerSummary: '', skills: [],
};


// --- ヘルパーコンポーネント ---
const SectionHeader: React.FC<{ title: string; isOpen: boolean; onClick: () => void }> = ({ title, isOpen, onClick }) => ( <button type="button" className="w-full bg-slate-100 p-4 rounded-lg cursor-pointer flex justify-between items-center text-left" onClick={onClick}> <h2 className="text-lg font-semibold text-slate-800">{title}</h2> {isOpen ? <ChevronUpIcon className="h-6 w-6 text-slate-500" /> : <ChevronDownIcon className="h-6 w-6 text-slate-500" />} </button> );
const MultiSelectButtons: React.FC<{ options: string[]; selected: string[]; onChange: (newSelection: string[]) => void; scrollable?: boolean; }> = ({ options, selected, onChange, scrollable }) => { const containerClasses = scrollable ? "flex flex-wrap gap-2 border rounded-md p-3 max-h-40 overflow-y-auto bg-white" : "flex flex-wrap gap-2"; return ( <div className={containerClasses}> {options.map(option => { const isSelected = selected.includes(option); return ( <button key={option} type="button" className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-100'}`} onClick={() => { const newSelection = isSelected ? selected.filter(s => s !== option) : [...selected, option]; onChange(newSelection); }} > {option} </button> ); })} </div> ); };
const FormRow: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => ( <div> <label className="block text-sm font-medium text-slate-700 mb-1"> {label} {required && <span className="text-red-500">*</span>} </label> {children} </div> );


// --- メインコンポーネント ---
export default function CandidateProfileForm() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [openSection, setOpenSection] = useState<string>('basicInfo');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userWithSub = session?.user as { sub?: string };

    if (authStatus === 'authenticated' && userWithSub?.sub) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const provider = "azure";
          const sub = userWithSub.sub;
          if (!sub) {
            console.error("User sub is undefined");
            return;
          }
          const url = `/api/candidate/profile/${provider}/${encodeURIComponent(sub)}`;

          const response = await axios.get<CandidateProfile>(url);
          setProfile(response.data || initialProfile);
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            setProfile(initialProfile);
          } else {
            console.error("Failed to fetch profile:", error);
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    } else if (authStatus !== 'loading') {
      setIsLoading(false);
    }
  }, [authStatus, session]);


  const handleNestedChange = (path: string, value: any) => {
    setProfile(prev => {
      if (!prev) return null;
      const keys = path.split('.');
      const newState = JSON.parse(JSON.stringify(prev));
      let current: any = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = current[keys[i]] || {};
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  const searchAddress = async () => {
    if (!profile?.basicInfo.address.postalCode) return alert('郵便番号を入力してください');
    try {
      const response = await axios.get<{ results?: { address1: string; address2: string; address3: string }[] }>(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${profile.basicInfo.address.postalCode}`);
      if (response.data.results) {
        const result = response.data.results[0];
        handleNestedChange('basicInfo.address.prefecture', result.address1);
        handleNestedChange('basicInfo.address.city', result.address2 + result.address3);
      } else {
        alert('該当する住所が見つかりませんでした');
      }
    } catch {
      alert('住所検索に失敗しました');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pendingProfile', JSON.stringify(profile));
    router.push('/candidate/profile/confirm');
  };

  if (isLoading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (authStatus !== 'authenticated') {
    return <Layout><div>このページにアクセスするにはサインインが必要です。</div></Layout>;
  }

  if (!profile) {
    return <Layout><div>プロファイルの読み込みに失敗しました。再度お試しください。</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">プロフィール編集</h1>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* --- 基本情報セクション --- */}
          <div className="space-y-1">
            <SectionHeader title="1. 基本情報" isOpen={openSection === 'basicInfo'} onClick={() => setOpenSection(openSection === 'basicInfo' ? '' : 'basicInfo')} />
            {openSection === 'basicInfo' && (
              <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
                <FormRow label="氏名" required>
                  <input type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" value={profile.basicInfo.fullName} onChange={e => handleNestedChange('basicInfo.fullName', e.target.value)} />
                </FormRow>
                <FormRow label="郵便番号">
                   <div className="flex gap-2">
                     <input type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm" maxLength={7} value={profile.basicInfo.address.postalCode} onChange={e => handleNestedChange('basicInfo.address.postalCode', e.target.value.replace(/[^0-9]/g, ''))} />
                     <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={searchAddress}>住所検索</button>
                   </div>
                </FormRow>
                <FormRow label="希望勤務地">
                  <MultiSelectButtons options={prefectures} selected={profile.basicInfo.workLocationPreferences || []} onChange={sel => handleNestedChange('basicInfo.workLocationPreferences', sel)} scrollable={true} />
                </FormRow>
              </div>
            )}
          </div>

          {/* --- 希望キャリアセクション --- */}
          <div className="space-y-1">
            <SectionHeader title="2. 希望キャリア" isOpen={openSection === 'career'} onClick={() => setOpenSection(openSection === 'career' ? '' : 'career')} />
            {openSection === 'career' && (
               <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
                  <FormRow label="希望職種">
                    <MultiSelectButtons options={jobTitles} selected={profile.careerPreferences?.desiredJobTitles || []} onChange={sel => handleNestedChange('careerPreferences.desiredJobTitles', sel)} />
                  </FormRow>
                  {/* ▼▼▼【ここを追加】▼▼▼ */}
                  <FormRow label="その他希望職種">
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={profile.careerPreferences?.otherDesiredJobTitle || ''}
                      onChange={e => handleNestedChange('careerPreferences.otherDesiredJobTitle', e.target.value)}
                    />
                  </FormRow>
                  {/* ▲▲▲【ここまでを追加】▲▲▲ */}
               </div>
            )}
          </div>

          {/* --- スキル・資格セクション --- */}
          <div className="space-y-1">
             <SectionHeader title="3. スキル・資格" isOpen={openSection === 'skills'} onClick={() => setOpenSection(openSection === 'skills' ? '' : 'skills')} />
             {openSection === 'skills' && (
                <div className="p-6 border rounded-b-lg bg-white space-y-4 shadow-sm">
                   <FormRow label="保有スキル">
                     <MultiSelectButtons options={SKILL_CANDIDATES} selected={profile.skills || []} onChange={sel => handleNestedChange('skills', sel)} />
                   </FormRow>
                   <FormRow label="保有資格">
                     <MultiSelectButtons options={certificationsList} selected={profile.certifications || []} onChange={sel => handleNestedChange('certifications', sel)} />
                   </FormRow>
                   {/* ▼▼▼【ここを追加】▼▼▼ */}
                   <FormRow label="その他保有資格">
                     <input
                       type="text"
                       className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       value={profile.certificationsOther || ''}
                       onChange={e => handleNestedChange('certificationsOther', e.target.value)}
                     />
                   </FormRow>
                   {/* ▲▲▲【ここまでを追加】▲▲▲ */}
                </div>
             )}
          </div>

          {/* --- 保存ボタン --- */}
          <div className="pt-5">
            <div className="flex justify-end gap-3">
              <button type="button" className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => router.push('/candidate/mypage')}>
                キャンセル
              </button>
              <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                入力内容を確認する
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
