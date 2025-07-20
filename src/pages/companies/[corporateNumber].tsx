// pages/companies/[corporateNumber].tsx

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import type { CompanyProfile } from '@/types/CompanyProfile';
import {
  BuildingOffice2Icon,
  BriefcaseIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../lib/apiClient';

// セクションコンポーネント
const PageSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <section className="py-12">
    <div className="flex items-center gap-3 mb-6">
      <Icon className="h-8 w-8 text-blue-600" />
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
    </div>
    <div className="text-slate-700 leading-relaxed">
      {children}
    </div>
  </section>
);

// Key-Value情報を表示するコンポーネント
const InfoPill: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-slate-100 p-4 rounded-lg">
    <p className="text-sm text-slate-600">{label}</p>
    <p className="font-semibold text-slate-900 break-words">{value || 'N/A'}</p>
  </div>
);

// 本社所在地の表示を整形するヘルパー関数
const formatHeadquarters = (hq: any): string => {
    if (!hq) return '未設定';
    if (typeof hq === 'string') return hq;
    if (typeof hq === 'object') return `${hq.country || ''} ${hq.region || ''} ${hq.city || ''}`.trim() || '未設定';
    return '未設定';
};


const PublicCompanyPage = () => {
  const router = useRouter();
  const { corporateNumber } = router.query;

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 問い合わせフォーム用のState
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (corporateNumber) {
      const fetchCompanyProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await apiClient(`/api/companies/${corporateNumber}`);
          if (!response.ok) throw new Error('企業の情報の取得に失敗しました。');
          const data = await response.json();
          setProfile(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCompanyProfile();
    }
  }, [corporateNumber]);

  // 問い合わせフォームの送信処理
  const handleInquirySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInquiryStatus('sending');
    try {
      const response = await apiClient('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: inquiryName,
          fromEmail: inquiryEmail,
          message: inquiryMessage,
          companyId: profile?.corporateNumber,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '送信に失敗しました。');

      setInquiryStatus('success');
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMessage('');
    } catch (err: any) {
      setInquiryStatus('error');
    }
  };


  if (isLoading) {
    return <Layout><p className="text-center p-12">読み込み中...</p></Layout>;
  }

  if (error || !profile) {
    return <Layout><p className="text-center p-12 text-red-500">{error || '企業情報が見つかりません。'}</p></Layout>;
  }

  return (
    <Layout>
      <div className="bg-white">
        {/* ヘッダーセクション */}
        <div className="relative bg-slate-700 h-64">
          {profile.headerImageUrl && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={profile.headerImageUrl}
                alt={`${profile.name}のヘッダー画像`}
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${profile.headerImageOffsetY || 50}%` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
             <div className="bg-white p-2 rounded-full shadow-lg">
                {profile.logoUrl ? (
<div className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-32 w-32 rounded-2xl bg-white border-4 border-white shadow-lg p-2 flex items-center justify-center">
                    <img
                        src={profile.logoUrl || `https://placehold.co/128x128/e2e8f0/334155?text=Logo`}
                        alt={`${profile.name}のロゴ`}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/128x128/e2e8f0/334155?text=Logo`; }}
                    />
                </div>
                ) : (
                    <div className="h-32 w-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border-4 border-white">
                        <span>Logo</span>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* 会社名・タグライン */}
        <div className="text-center pt-24 pb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">{profile.name}</h1>
            {profile.tagline && <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600">{profile.tagline}</p>}
        </div>


        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 divide-y divide-slate-200">
          {/* 会社概要セクション */}
          <PageSection title="会社概要" icon={BuildingOffice2Icon}>
            <p className="text-lg mb-8">{profile.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoPill label="本社所在地" value={formatHeadquarters(profile.headquarters)} />
              <InfoPill label="公式サイト" value={profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.website}</a> : 'N/A'} />
              <InfoPill label="設立年" value={profile.yearFounded} />
              <InfoPill label="従業員規模" value={profile.companySize} />
              <InfoPill label="資本金" value={profile.capitalStock ? `${new Intl.NumberFormat('ja-JP').format(Number(profile.capitalStock))}円` : 'N/A'} />
            </div>
          </PageSection>

          <PageSection title="働く魅力・カルチャー" icon={SparklesIcon}>
            <h3 className="font-semibold text-lg mb-2">ミッション</h3>
            <p className="mb-6 whitespace-pre-wrap">{profile.mission || '未設定'}</p>
            <h3 className="font-semibold text-lg mb-2">福利厚生</h3>
            <ul className="list-disc list-inside space-y-1">
              {profile.employeeBenefits?.map((benefit, i) => <li key={i}>{benefit}</li>)}
            </ul>
          </PageSection>

          <PageSection title="セキュリティへの取り組み" icon={ShieldCheckIcon}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoPill label="セキュリティチームの規模" value={profile.securityTeamSize} />
                <InfoPill label="CISO設置" value={profile.hasCiso ? 'はい' : 'いいえ'} />
                <InfoPill label="CSIRT設置" value={profile.hasCsirt ? 'はい' : 'いいえ'} />
                <InfoPill label="資格取得支援" value={profile.certificationSupport ? 'あり' : 'なし'} />
             </div>
          </PageSection>

          <PageSection title="募集中のポジション" icon={BriefcaseIcon}>
            <div className="space-y-4">
              {/* ★★★ profile.jobs を参照するように修正 ★★★ */}
              {profile.jobs && profile.jobs.length > 0 ? (
                profile.jobs.map(job => (
                  <div key={job.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-blue-700">{job.title}</p>
                      <p className="text-sm text-slate-600">{job.location}</p>
                    </div>
                    <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">詳細を見る</button>
                  </div>
                ))
              ) : (
                <p>現在、募集中のポジションはありません。</p>
              )}
            </div>
          </PageSection>

          <PageSection title="この企業に問い合わせる" icon={ChatBubbleBottomCenterTextIcon}>
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="sr-only">お名前</label>
                <input type="text" name="name" id="name" value={inquiryName} onChange={(e) => setInquiryName(e.target.value)} required className="w-full border rounded p-3" placeholder="お名前" />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">メールアドレス</label>
                <input type="email" name="email" id="email" value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} required className="w-full border rounded p-3" placeholder="メールアドレス" />
              </div>
              <div>
                <label htmlFor="message" className="sr-only">メッセージ</label>
                <textarea name="message" id="message" value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)} required rows={4} className="w-full border rounded p-3" placeholder="ご質問やメッセージをご記入ください"></textarea>
              </div>
              <button type="submit" disabled={inquiryStatus === 'sending'} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50">
                {inquiryStatus === 'sending' ? '送信中...' : '送信する'}
              </button>
              {inquiryStatus === 'success' && <p className="text-green-600 text-center mt-4">お問い合わせありがとうございます。送信されました。</p>}
              {inquiryStatus === 'error' && <p className="text-red-600 text-center mt-4">送信に失敗しました。時間をおいて再度お試しください。</p>}
            </form>
          </PageSection>

        </div>
      </div>
    </Layout>
  );
};

export default PublicCompanyPage;
