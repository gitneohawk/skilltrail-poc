import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { CandidateProfile } from '@/types/CandidateProfile';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { getDefaultProvider } from '@/utils/azureBlob';

export default function ConfirmProfile() {
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

useEffect(() => {
  const stored = localStorage.getItem('pendingProfile');
  if (stored) {
    const parsed: CandidateProfile = JSON.parse(stored);

    // mode が未設定なら basicInfo.remoteWorkPreference.type を反映
    if (
      !parsed.careerPreferences?.hybridPreference?.mode &&
      parsed.basicInfo.remoteWorkPreference?.type
    ) {
      parsed.careerPreferences = {
        ...parsed.careerPreferences,
        hybridPreference: {
          ...parsed.careerPreferences?.hybridPreference,
          mode: parsed.basicInfo.remoteWorkPreference.type,
        },
      };
    }

    setProfile(parsed);
  }
}, []);

  async function handleSave() {
    try {
      const sub = session?.user?.sub;
      const provider = getDefaultProvider(session);
      if (!sub) {
        alert("セッション情報が取得できませんでした");
        return;
      }

      const response = await fetch(`/api/candidate/profile/${provider}/${sub}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        router.push('/candidate/mypage');
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("保存中にエラーが発生しました");
    }
  }

  if (!profile) {
    return (
      <Layout>
        <div className="p-8">確認データが見つかりませんでした。</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">プロフィール確認</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-2">基本情報</h2>
          <p><strong>氏名:</strong> {profile.basicInfo.fullName}</p>
          <p><strong>年齢:</strong> {profile.basicInfo.age}</p>
          <p><strong>メール:</strong> {profile.basicInfo.contact.email}</p>
          <p><strong>郵便番号:</strong> {profile.basicInfo.address.postalCode}</p>
          <p><strong>都道府県:</strong> {profile.basicInfo.address.prefecture}</p>
          <p><strong>市区町村:</strong> {profile.basicInfo.address.city}</p>
          <p><strong>住所詳細:</strong> {profile.basicInfo.address.detail}</p>
          <p><strong>希望勤務地:</strong> {profile.basicInfo.workLocationPreferences?.join(', ')}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-2">希望条件</h2>
          <p><strong>希望職種:</strong> {profile.careerPreferences?.desiredJobTitles?.join(', ')}</p>
          <p><strong>その他希望職種:</strong> {profile.careerPreferences?.otherDesiredJobTitle || "なし"}</p>
          <p>
            <strong>勤務形態:</strong>{' '}
            {profile.careerPreferences?.hybridPreference?.mode === 'Onsite' && '出社'}
            {profile.careerPreferences?.hybridPreference?.mode === 'Remote' && 'フルリモート勤務'}
            {profile.careerPreferences?.hybridPreference?.mode === 'Hybrid' &&
              `ハイブリッド勤務（週${profile.careerPreferences.hybridPreference.onSiteDays}日出社）`}
            {!profile.careerPreferences?.hybridPreference?.mode && '未設定'}
          </p>
          <p><strong>資格:</strong> {profile.certifications?.join(', ')}</p>
          <p><strong>その他資格:</strong> {profile.certificationsOther || "なし"}</p>
        </div>

        <div className="flex space-x-4">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">この内容で保存</button>
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-400 text-white rounded">キャンセル</button>
        </div>
      </div>
    </Layout>
  );
}