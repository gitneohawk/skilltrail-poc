import { useEffect, useState, ReactNode } from 'react';
import Layout from '@/components/Layout';
import { CandidateProfile } from '@/types/CandidateProfile';
import { useRouter } from 'next/router';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

// --- ヘルパーコンポーネント ---
// 確認項目の行を生成するコンポーネント
const InfoRow: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-slate-200">
    <dt className="text-sm font-medium text-slate-600">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{children || '未設定'}</dd>
  </div>
);

// セクションのヘッダーを生成するコンポーネント
const SectionHeader: React.FC<{ title: string; onEdit: () => void }> = ({ title, onEdit }) => (
  <div className="flex justify-between items-center pb-4">
    <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
    <button onClick={onEdit} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">
      <PencilSquareIcon className="h-4 w-4" />
      修正する
    </button>
  </div>
);


// --- メインコンポーネント ---
export default function ConfirmProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pendingProfile');
    if (stored) {
      setProfile(JSON.parse(stored));
    }
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/candidate/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        localStorage.removeItem('pendingProfile'); // 保存成功後にlocalStorageをクリア
        router.push('/candidate/mypage');
      } else {
        alert('保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <Layout>
        <div className="text-center p-12">
          <h2 className="text-xl font-semibold mb-4">確認データが見つかりません</h2>
          <p className="text-slate-600 mb-6">プロフィール入力ページからやり直してください。</p>
          <button onClick={() => router.push('/candidate/profile')} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            入力ページへ戻る
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">入力内容の確認</h1>
            <p className="mt-2 text-slate-600">以下の内容でプロフィールを保存します。よろしいですか？</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">

          {/* 基本情報セクション */}
          <div>
            <SectionHeader title="基本情報" onEdit={() => router.back()} />
            <dl>
              <InfoRow label="氏名">{profile.basicInfo.fullName}</InfoRow>
              <InfoRow label="年齢">{profile.basicInfo.age}歳</InfoRow>
              <InfoRow label="メールアドレス">{profile.basicInfo.contact.email}</InfoRow>
              <InfoRow label="住所">
                〒{profile.basicInfo.address.postalCode}<br/>
                {profile.basicInfo.address.prefecture}
                {profile.basicInfo.address.city}
                {profile.basicInfo.address.detail}
              </InfoRow>
              <InfoRow label="希望勤務地">{profile.basicInfo.workLocationPreferences?.join(', ')}</InfoRow>
            </dl>
          </div>

          {/* 希望条件セクション */}
          <div>
            <SectionHeader title="希望条件・スキル" onEdit={() => router.back()} />
            <dl>
              <InfoRow label="希望職種">{profile.careerPreferences?.desiredJobTitles?.join(', ')}</InfoRow>
              <InfoRow label="保有スキル">{profile.skills?.join(', ')}</InfoRow>
              <InfoRow label="保有資格">{profile.certifications?.join(', ')}</InfoRow>
            </dl>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => router.back()} disabled={isSaving} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
            内容を修正する
          </button>
          <button onClick={handleSave} disabled={isSaving} className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {isSaving ? '保存中...' : 'この内容で保存'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
