import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { CandidateProfile } from '@/types/CandidateProfile';
import { z } from 'zod';
import axios from 'axios';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const jobTitles = [
  'SOCアナリスト','CSIRTエンジニア','セキュリティコンサルタント',
  'セキュリティアーキテクト','脆弱性診断エンジニア','GRC担当',
  'セキュリティエンジニア（インフラ系）','セキュリティエンジニア（アプリ系）'
];

const certificationsList = [
  'CISSP','CISA','CISM','CEH','CompTIA Security+','CompTIA CySA+',
  'AWS Certified Security','Microsoft SC-100','Microsoft SC-200','Azure Security Engineer'
];

const initialProfile: CandidateProfile = {
  basicInfo: {
    fullName: '',
    age: 20,
    gender: '',
    residence: '',
    address: {
      prefecture: '',
      city: '',
      postalCode: ''
    },
    contact: {
      email: '',
      phone: ''
    },
    workLocationPreferences: [],
    remoteWorkPreference: {
      type: 'Onsite',
      hybridDaysOnsite: 0
    }
  },
  careerPreferences: {},
  certifications: [],
  experience: {},
  technicalSkills: {},
  languageSkills: {},
  softSkills: [],
  mobilityFlexibility: {},
  privacySettings: {
    profileVisibility: 'Public',
    allowScouting: true
  }
};

export default function CandidateProfileForm() {
  const { data: session } = useSession();

  const fetcher = async (url: string): Promise<CandidateProfile> => {
    const res = await axios.get<CandidateProfile>(url);
    return res.data;
  };

  const provider = "azure";
  const sub = session?.user?.sub || "unknown";
  const safeSub = encodeURIComponent(sub);

  const { data: fetchedProfile, error } = useSWR<CandidateProfile>(
    session ? `/api/candidate/profile/${provider}/${safeSub}` : null,
    fetcher
  );

  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);

  React.useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
    }
  }, [fetchedProfile]);

  const router = useRouter();

  const handleChange = (field: keyof CandidateProfile['basicInfo'], value: any) => {
    setProfile(prev => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: value
      }
    }));
  };

  const searchAddress = async () => {
    if (!profile.basicInfo.address.postalCode) return alert('郵便番号を入力してください');

    interface ZipCloudResponse {
      results?: {
        address1: string;
        address2: string;
        address3: string;
      }[];
    }

    try {
      const response = await axios.get<ZipCloudResponse>(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${profile.basicInfo.address.postalCode}`);
      if (response.data.results) {
        const result = response.data.results[0];
        setProfile(prev => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            address: {
              ...prev.basicInfo.address,
              prefecture: result.address1,
              city: result.address2 + result.address3
            }
          }
        }));
      } else {
        alert('該当する住所が見つかりませんでした');
      }
    } catch {
      alert('住所検索に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const schema = z.object({
      basicInfo: z.object({
        fullName: z.string().min(1, "氏名は必須です"),
        age: z.number().min(0),
        gender: z.string(),
        residence: z.string(),
        address: z.object({
          prefecture: z.string(),
          city: z.string(),
          postalCode: z.string(),
          detail: z.string().optional(),
        }),
        contact: z.object({
          email: z.string().email("メールアドレスの形式が不正です"),
          phone: z.string(),
        }),
        workLocationPreferences: z.array(z.string()),
        remoteWorkPreference: z.object({
          type: z.enum(["Onsite", "Hybrid", "Remote"]),
          hybridDaysOnsite: z.number().max(5),
        }),
      }),
      careerPreferences: z.object({
        desiredJobTitles: z.array(z.string()).optional(),
        otherDesiredJobTitle: z.string().optional(),
      }),
      certifications: z.array(z.string()).optional(),
      certificationsOther: z.string().optional(),
      experience: z.any(),
      technicalSkills: z.any(),
      languageSkills: z.any(),
      softSkills: z.any(),
      mobilityFlexibility: z.any(),
      privacySettings: z.any(),
    });

    try {
      schema.parse(profile);
    } catch (validationError) {
      console.error("Validation Error:", validationError);
      alert("入力に不備があります。必須項目を確認してください。");
      return;
    }

    try {
      const provider = "azure";
      const response = await fetch(`/api/candidate/profile/${provider}/${safeSub}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert('Profile saved successfully!');
        router.push('/candidate/mypage');
      } else {
        console.error('Failed to save profile');
        alert('Failed to save profile.');
      }
    } catch (error) {
      console.error('Error submitting profile:', error);
      alert('An error occurred while saving profile.');
    }
  };

  if (!fetchedProfile && !error) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">候補者プロフィール入力</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block mb-1 font-semibold">氏名（必須）</label>
          <input type="text" className="border p-2 w-full" value={profile.basicInfo.fullName} onChange={e => handleChange('fullName', e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">年齢（必須）</label>
          <input type="number" className="border p-2 w-full" value={profile.basicInfo.age} onChange={e => handleChange('age', Number(e.target.value))} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">性別</label>
          <div className="flex gap-4">
            {['男性','女性','その他','回答しない'].map(opt => (
              <label key={opt}><input type="radio" className="mr-1" checked={profile.basicInfo.gender === opt} onChange={() => handleChange('gender', opt)} />{opt}</label>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold">居住地（都道府県）</label>
          <select className="border p-2 w-full" value={profile.basicInfo.residence} onChange={e => handleChange('residence', e.target.value)}>
            <option value="">選択してください</option>
            {prefectures.map(pref => <option key={pref} value={pref}>{pref}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">郵便番号</label>
          <div className="flex gap-2">
            <input type="text" className="border p-2 w-full" value={profile.basicInfo.address.postalCode} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, address: { ...prev.basicInfo.address, postalCode: e.target.value } } }))} />
            <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded" onClick={searchAddress}>住所検索</button>
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold">都道府県</label>
          <input type="text" className="border p-2 w-full" value={profile.basicInfo.address.prefecture} readOnly />
        </div>

        <div>
          <label className="block mb-1 font-semibold">市区町村</label>
          <input type="text" className="border p-2 w-full" value={profile.basicInfo.address.city} readOnly />
        </div>

        <div>
          <label className="block mb-1 font-semibold">住所詳細（丁目・番地・建物名）</label>
          <input type="text" className="border p-2 w-full" value={profile.basicInfo.address.detail || ""} onChange={e => setProfile(prev => ({ 
            ...prev, 
            basicInfo: { 
              ...prev.basicInfo, 
              address: { 
                ...prev.basicInfo.address, 
                detail: e.target.value 
              } 
            } 
          }))} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">メールアドレス（必須）</label>
          <input type="email" className="border p-2 w-full" value={profile.basicInfo.contact.email} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, contact: { ...prev.basicInfo.contact, email: e.target.value } } }))} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">電話番号</label>
          <input type="tel" className="border p-2 w-full" value={profile.basicInfo.contact.phone} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, contact: { ...prev.basicInfo.contact, phone: e.target.value } } }))} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">ハイブリッド勤務出社日数（最大5日）</label>
          <select className="border p-2 w-full" value={profile.basicInfo.remoteWorkPreference.hybridDaysOnsite} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, remoteWorkPreference: { ...prev.basicInfo.remoteWorkPreference, hybridDaysOnsite: Number(e.target.value) } } }))}>
            {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}日</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">希望職種</label>
          <select multiple className="border p-2 w-full" value={profile.careerPreferences?.desiredJobTitles ?? []} onChange={e => {
            const options = Array.from(e.target.selectedOptions, o => o.value);
            setProfile(prev => ({ ...prev, careerPreferences: { ...prev.careerPreferences, desiredJobTitles: options } }));
          }}>
            {jobTitles.map(title => <option key={title} value={title}>{title}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">その他希望職種</label>
          <input type="text" className="border p-2 w-full" value={profile.careerPreferences?.otherDesiredJobTitle || ""} onChange={e => setProfile(prev => ({
            ...prev,
            careerPreferences: {
              ...prev.careerPreferences,
              otherDesiredJobTitle: e.target.value
            }
          }))} />
        </div>

        <div>
          <label className="block mb-1 font-semibold">資格</label>
          <select multiple className="border p-2 w-full" value={profile.certifications ?? []} onChange={e => {
            const options = Array.from(e.target.selectedOptions, o => o.value);
            setProfile(prev => ({ ...prev, certifications: options }));
          }}>
            {certificationsList.map(cert => <option key={cert} value={cert}>{cert}</option>)}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">その他資格</label>
          <input type="text" className="border p-2 w-full" value={profile.certificationsOther || ""} onChange={e => setProfile(prev => ({
            ...prev,
            certificationsOther: e.target.value
          }))} />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">プロフィールを保存</button>
      </form>
    </div>
  );
}