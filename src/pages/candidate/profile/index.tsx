import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { CandidateProfile } from '@/types/CandidateProfile';
import { z } from 'zod';
import axios from 'axios';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { SKILL_CANDIDATES } from '@/types/Skills';

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
    address: {
      prefecture: '',
      city: '',
      postalCode: '',
      detail: ''
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
  careerPreferences: {
    desiredJobTitles: [],
    otherDesiredJobTitle: '',
    hybridPreference: {
      mode: '週2日出社',
      onSiteDays: 0,
    },
    preferredStartTime: 'できるだけ早く',
  },
  certifications: [],
  certificationsOther: '',
  experience: {},
  technicalSkills: {},
  languageSkills: {},
  softSkills: [],
  mobilityFlexibility: {},
  privacySettings: {
    profileVisibility: 'Public',
    allowScouting: true
  },
  careerSummary: '',
  skills: [],
};

export default function CandidateProfileForm() {
  const { data: session, status: authStatus } = useSession();

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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSkillEdit, setShowSkillEdit] = useState(false);
  const [tempSkills, setTempSkills] = useState<string[]>(profile.skills || []);
  const [otherSkill, setOtherSkill] = useState('');
  const [skillError, setSkillError] = useState('');

  React.useEffect(() => {
    if (fetchedProfile) {
      setProfile(prev => ({
        ...prev,
        ...fetchedProfile,
        careerPreferences: {
          ...prev.careerPreferences,
          ...fetchedProfile.careerPreferences,
          hybridPreference: {
            ...prev.careerPreferences?.hybridPreference,
            ...fetchedProfile.careerPreferences?.hybridPreference,
          },
        },
      }));
    }
  }, [fetchedProfile]);

  // Effect to update hybridDaysOnsite based on remoteWorkPreference.type
  React.useEffect(() => {
    setProfile(prev => {
      const type = prev.basicInfo.remoteWorkPreference.type;
      const updatedDays =
        type === 'Onsite'
          ? 5
          : type === 'Remote'
            ? 0
            : prev.basicInfo.remoteWorkPreference.hybridDaysOnsite;
      return {
        ...prev,
        basicInfo: {
          ...prev.basicInfo,
          remoteWorkPreference: {
            ...prev.basicInfo.remoteWorkPreference,
            hybridDaysOnsite: updatedDays,
          },
        },
      };
    });
  }, [profile.basicInfo.remoteWorkPreference.type]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const schema = z.object({
      basicInfo: z.object({
        fullName: z.string().min(1, "氏名は必須です"),
        age: z.number().min(18).max(120),
        gender: z.string(),
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
        hybridPreference: z.object({
          mode: z.string().default('週2日出社'),
          onSiteDays: z.number(),
        }),
        preferredStartTime: z.string().default('できるだけ早く'),
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
      console.log("Validating profile:", profile);
      schema.parse(profile);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("Zod validation issues:", JSON.stringify(validationError.issues, null, 2));
      } else {
        console.error("Unknown validation error:", validationError);
      }
      alert("入力に不備があります。必須項目を確認してください。");
      return;
    }

    localStorage.setItem('pendingProfile', JSON.stringify(profile));
    router.push('/candidate/profile/confirm');
  };

  // スキル編集UIの保存処理
  const handleSkillSave = () => {
    if (tempSkills.length === 0 && !otherSkill.trim()) {
      setSkillError('1つ以上スキルを選択または入力してください');
      return;
    }
    setProfile(prev => ({ ...prev, skills: otherSkill.trim() ? [...tempSkills, otherSkill.trim()] : tempSkills }));
    setShowSkillEdit(false);
    setSkillError('');
  };

  if (authStatus === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">候補者プロフィール入力</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveSuccess && (
            <div className="bg-green-100 text-green-800 p-2 rounded mb-4">
              プロフィールが保存されました
            </div>
          )}

          <div>
            <label className="block mb-1 font-semibold">
              氏名（必須） <span className="text-red-500">*</span>
            </label>
            <input type="text" className="border p-2 w-full bg-white" value={profile.basicInfo.fullName} onChange={e => handleChange('fullName', e.target.value)} />
          </div>

          <div>
            <label className="block mb-1 font-semibold">
              年齢（必須） <span className="text-red-500">*</span>
            </label>
            <input type="number" className="border p-2 w-full bg-white" value={profile.basicInfo.age} min={18} max={120} onChange={e => handleChange('age', Number(e.target.value))} />
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
            <label className="block mb-1 font-semibold">郵便番号</label>
            <div className="flex gap-2">
              <input type="text" className="border p-2 w-full bg-white" maxLength={7} value={profile.basicInfo.address.postalCode} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, address: { ...prev.basicInfo.address, postalCode: e.target.value.replace(/[^0-9]/g, '') } } }))} />
              <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded" onClick={searchAddress}>住所検索</button>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold">都道府県</label>
            <select className="border p-2 w-full bg-white" value={profile.basicInfo.address.prefecture} onChange={e => setProfile(prev => ({
              ...prev,
              basicInfo: {
                ...prev.basicInfo,
                address: {
                  ...prev.basicInfo.address,
                  prefecture: e.target.value
                }
              }
            }))}>
              <option value="">選択してください</option>
              {prefectures.map(pref => <option key={pref} value={pref}>{pref}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">市区町村</label>
            <input type="text" className="border p-2 w-full bg-white" value={profile.basicInfo.address.city} readOnly />
          </div>

          <div>
            <label className="block mb-1 font-semibold">住所詳細（丁目・番地・建物名）</label>
            <input type="text" className="border p-2 w-full bg-white" value={profile.basicInfo.address.detail || ""} onChange={e => setProfile(prev => ({ 
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
  <label className="block mb-1 font-semibold">希望勤務地</label>
  <div className="flex flex-wrap gap-2">
    {prefectures.map(pref => {
      const selected = profile.basicInfo.workLocationPreferences ?? [];
      const isSelected = selected.includes(pref);
      return (
        <button
          key={pref}
          type="button"
          className={`px-3 py-1 rounded border ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
          onClick={() => {
            const newSelection = isSelected
              ? selected.filter(p => p !== pref)
              : [...selected, pref];
            setProfile(prev => ({
              ...prev,
              basicInfo: {
                ...prev.basicInfo,
                workLocationPreferences: newSelection,
              }
            }));
          }}
        >
          {pref}
        </button>
      );
    })}
  </div>
</div>

          <div>
            <label className="block mb-1 font-semibold">
              メールアドレス（必須） <span className="text-red-500">*</span>
            </label>
            <input type="email" className="border p-2 w-full bg-white" value={profile.basicInfo.contact.email} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, contact: { ...prev.basicInfo.contact, email: e.target.value } } }))} />
          </div>

          <div>
            <label className="block mb-1 font-semibold">電話番号</label>
            <input type="tel" className="border p-2 w-full bg-white" value={profile.basicInfo.contact.phone} onChange={e => setProfile(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, contact: { ...prev.basicInfo.contact, phone: e.target.value } } }))} />
          </div>

          <div>
  <label className="block mb-1 font-semibold">勤務形態</label>
  <select
    className="border p-2 w-full bg-white"
    value={profile.basicInfo.remoteWorkPreference.type}
    onChange={e => setProfile(prev => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        remoteWorkPreference: {
          ...prev.basicInfo.remoteWorkPreference,
          type: e.target.value as 'Onsite' | 'Hybrid' | 'Remote'
        }
      }
    }))}
  >
    <option value="Onsite">出社</option>
    <option value="Hybrid">ハイブリッド</option>
    <option value="Remote">フルリモート</option>
  </select>
</div>

          {profile.basicInfo.remoteWorkPreference.type === 'Hybrid' && (
            <div>
              <label className="block mb-1 font-semibold">ハイブリッド勤務出社日数（最大5日）</label>
              <select
                className="border p-2 w-full bg-white"
                value={profile.basicInfo.remoteWorkPreference.hybridDaysOnsite}
                onChange={e =>
                  setProfile(prev => ({
                    ...prev,
                    basicInfo: {
                      ...prev.basicInfo,
                      remoteWorkPreference: {
                        ...prev.basicInfo.remoteWorkPreference,
                        hybridDaysOnsite: Number(e.target.value),
                      },
                    },
                  }))
                }
              >
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>
                    {n}日
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-1 font-semibold">希望職種</label>
            <div className="flex flex-wrap gap-2">
              {jobTitles.map(title => {
                const selected = profile.careerPreferences?.desiredJobTitles ?? [];
                const isSelected = selected.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    className={`px-3 py-1 rounded border ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
                    onClick={() => {
                      const newSelection = isSelected
                        ? selected.filter(t => t !== title)
                        : [...selected, title];
                      setProfile(prev => ({ 
                        ...prev, 
                        careerPreferences: { 
                          ...prev.careerPreferences, 
                          desiredJobTitles: newSelection 
                        } 
                      }));
                    }}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold">その他希望職種</label>
            <input type="text" className="border p-2 w-full bg-white" value={profile.careerPreferences?.otherDesiredJobTitle || ""} onChange={e => setProfile(prev => ({
              ...prev,
              careerPreferences: {
                ...prev.careerPreferences,
                otherDesiredJobTitle: e.target.value
              }
            }))} />
          </div>

          <div>
            <label className="block mb-1 font-semibold">資格</label>
            <div className="flex flex-wrap gap-2">
              {certificationsList.map(cert => {
                const selected = profile.certifications ?? [];
                const isSelected = selected.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    className={`px-3 py-1 rounded border ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
                    onClick={() => {
                      const newSelection = isSelected
                        ? selected.filter(c => c !== cert)
                        : [...selected, cert];
                      setProfile(prev => ({ 
                        ...prev, 
                        certifications: newSelection 
                      }));
                    }}
                  >
                    {cert}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold">その他資格</label>
            <input type="text" className="border p-2 w-full bg-white" value={profile.certificationsOther || ""} onChange={e => setProfile(prev => ({
              ...prev,
              certificationsOther: e.target.value
            }))} />
          </div>

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">変更を保存する</button>

          {/* スキル編集UI */}
          <div className="mt-8">
            <button
              type="button"
              className="bg-purple-600 text-white px-4 py-2 rounded mb-2"
              onClick={() => setShowSkillEdit(v => !v)}
            >
              {showSkillEdit ? 'スキル編集を閉じる' : 'スキルを編集'}
            </button>
            {showSkillEdit && (
              <div className="border rounded p-4 bg-gray-50 mt-2">
                <div className="mb-2 font-semibold">保有スキル（複数選択可）</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SKILL_CANDIDATES.map(skill => (
                    <label key={skill} className={`px-3 py-1 rounded border cursor-pointer ${tempSkills.includes(skill) ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={tempSkills.includes(skill)}
                        onChange={e => {
                          setTempSkills(prev =>
                            e.target.checked
                              ? [...prev, skill]
                              : prev.filter(s => s !== skill)
                          );
                        }}
                      />
                      {skill}
                    </label>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1">その他スキル</label>
                  <input
                    type="text"
                    className="border p-2 w-full bg-white"
                    placeholder="その他のスキルを入力"
                    value={otherSkill}
                    onChange={e => setOtherSkill(e.target.value)}
                  />
                </div>
                {skillError && (
                  <div className="text-red-600 mb-2">{skillError}</div>
                )}
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                  onClick={handleSkillSave}
                >
                  スキルを保存
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
