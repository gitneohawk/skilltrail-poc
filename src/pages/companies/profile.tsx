// pages/companies/profile.tsx

import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import type { CompanyProfile } from '@/types/CompanyProfile';
import { apiClient } from '@/lib/apiClient';

// フォームで管理するデータの型
type ContactFormData = {
  name: string;
  email: string;
  phone?: string | null;
};

type ProfileFormData = Partial<Omit<CompanyProfile, 'capitalStock' | 'contact'>> & {
  capitalStock?: string;
  contact?: ContactFormData;
  headerImageOffsetY?: number;
};

// gBizINFOからの検索結果の型
type GbizSearchResult = {
  corporateNumber: string;
  name: string;
  location: string;
};

// ヘルパーコンポーネント
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pt-8">
    <h2 className="text-xl font-semibold border-b border-slate-300 pb-3 mb-6">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const FormRow: React.FC<{ label: string; children: React.ReactNode; description?: string }> = ({ label, children, description }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
  </div>
);


const CompanyProfilePage = () => {
  const router = useRouter();
  const { status } = useSession();

  const [mode, setMode] = useState<'loading' | 'search' | 'edit'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyNameInput, setCompanyNameInput] = useState('');
  const [searchResults, setSearchResults] = useState<GbizSearchResult[]>([]);
  const [profile, setProfile] = useState<ProfileFormData>({
    contact: { name: '', email: '' },
    headerImageOffsetY: 50,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);

  // 既存プロフィールの読み込み
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchExistingProfile = async () => {
        // ★★★ 修正点1: try...catchを追加 ★★★
        try {
        const response = await apiClient('/api/companies/profile', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setProfile({
            ...data,
            capitalStock: data.capitalStock?.toString(),
            contact: data.contact || { name: '', email: '' }
          });
          setMode('edit');
        } else if (response.status === 404) {
          // 新規ユーザー: エラーはセットせず、検索モードへ
          setMode('search');
        } else {
          // その他のエラー（サーバーエラー等）のみエラー表示
          setError("プロファイルの読み込みに失敗しました。ネットワーク接続を確認してください。");
          setMode('search');
        }
      } catch (err) {
        // ネットワークエラーなどでfetch自体が失敗した場合
        console.error("Failed to fetch company profile:", err);
        setError("プロファイルの読み込みに失敗しました。ネットワーク接続を確認してください。");
        setMode('search');
      }
      };
      fetchExistingProfile();
    }
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  // gBizINFO検索処理
  const handleGbizSearch = async () => {
    if (!companyNameInput) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient('/api/companies/gbiz-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyNameInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '検索に失敗しました。');
      setSearchResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) setError('該当する企業が見つかりませんでした。');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 会社選択後、詳細情報を取得してフォームを埋める処理
  const handleSelectCompany = async (company: GbizSearchResult) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient('/api/companies/gbiz-fetch-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corporateNumber: company.corporateNumber }),
      });
      const details = await response.json();
      if (!response.ok) throw new Error(details.error || '詳細情報の取得に失敗しました。');

      setProfile({
        ...profile,
        corporateNumber: details.corporateNumber,
        name: details.name,
        yearFounded: details.yearFounded,
        companySize: details.companySize,
        capitalStock: details.capitalStock?.toString(),
        headquarters: details.headquarters,
        website: details.website || '',
        description: details.description || '',
        industry: details.industry || '',
      });
      setSearchResults([]);
      setMode('edit');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // フォーム入力ハンドラ
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const checked = isCheckbox ? e.target.checked : undefined;

    let finalValue: any = value;
    if (isCheckbox) {
      finalValue = checked;
    } else if (name === 'yearFounded') {
      finalValue = value === '' ? null : parseInt(value, 10);
    } else if (name === 'capitalStock') {
      finalValue = value.replace(/[^0-9]/g, '');
    }

    setProfile(p => ({ ...p, [name]: finalValue }));
  };

  const handleContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(p => ({
      ...p,
      contact: {
        ...p.contact!,
        [name]: value,
      }
    }));
  };

  const handleArrayChange = (e: ChangeEvent<HTMLInputElement>, fieldName: keyof ProfileFormData) => {
    const value = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    setProfile(p => ({ ...p, [fieldName]: value }));
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(y - (imageRef.current?.offsetTop || 0));
  };

  // ドラッグ中
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;
    e.preventDefault();
    const containerHeight = containerRef.current.offsetHeight;
    const imageHeight = imageRef.current.offsetHeight;
    if (imageHeight <= containerHeight) return;

    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    let newTop = y - dragStartY;

    if (newTop > 0) newTop = 0;
    if (newTop < containerHeight - imageHeight) newTop = containerHeight - imageHeight;

    imageRef.current.style.top = `${newTop}px`;

    const offsetYPercent = Math.round(Math.abs(newTop) / (imageHeight - containerHeight) * 100);
    setProfile(p => ({ ...p, headerImageOffsetY: offsetYPercent }));
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 保存処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // ★★★ 修正点2: methodを動的に設定 ★★★
    const method = profile.updatedAt ? 'PUT' : 'POST';

    try {
        const response = await apiClient('/api/companies/profile', {
          method: method, // POST or PUT
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(profile)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || '保存に失敗しました。');
        }
        alert('プロフィールが保存されました');
        router.push('/companies/mypage');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  if (status === 'loading' || mode === 'loading') {
    return <Layout><p className="text-center p-8">Loading...</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">{!profile.updatedAt ? '企業プロフィール登録' : '企業プロフィール編集'}</h1>

        {mode === 'search' && (
          <>
            <div className="mb-8 p-6 bg-slate-50 rounded-lg border">
              <label htmlFor="company-search" className="block text-sm font-medium text-slate-700 mb-2">会社名で検索して基本情報を自動入力</label>
              <div className="flex gap-2">
                <input id="company-search" type="text" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} placeholder="例：株式会社野村総合研究所" className="flex-grow border rounded p-2"/>
                <button onClick={handleGbizSearch} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{isLoading ? '検索中...' : '検索'}</button>
              </div>
            </div>
            <div className="mb-8">
              {error && <p className="text-red-500 text-sm my-2">{error}</p>}
              {!isLoading && searchResults.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold mb-2">検索結果</h2>
                  <ul className="border rounded-md divide-y bg-white">
                    {searchResults.map((company) => (<li key={company.corporateNumber}><button onClick={() => handleSelectCompany(company)} className="w-full text-left p-4 hover:bg-slate-100 transition-colors"><p className="font-bold text-slate-800">{company.name}</p><p className="text-sm text-slate-600">{company.location}</p></button></li>))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}

        {mode === 'edit' && (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <FormSection title="基本情報">
              <FormRow label="会社名"><input type="text" value={profile.name || ''} readOnly className="w-full border rounded p-2 bg-slate-100" /></FormRow>
              <FormRow label="本社所在地"><input name="headquarters" type="text" value={profile.headquarters || ''} onChange={handleChange} className="w-full border rounded p-2"/></FormRow>
              <FormRow label="設立年"><input name="yearFounded" type="number" value={profile.yearFounded || ''} onChange={handleChange} className="w-full border rounded p-2"/></FormRow>
              <FormRow label="資本金 (円)">
                <input name="capitalStock" type="text" pattern="[0-9]*" value={profile.capitalStock || ''} onChange={handleChange} className="w-full border rounded p-2"/>
                {profile.capitalStock && (<p className="text-sm text-slate-500 mt-1 text-right">{new Intl.NumberFormat('ja-JP').format(Number(profile.capitalStock))} 円</p>)}
              </FormRow>
              <FormRow label="従業員規模"><input name="companySize" type="text" value={profile.companySize || ''} onChange={handleChange} className="w-full border rounded p-2"/></FormRow>
              <FormRow label="公式サイト"><input name="website" type="url" value={profile.website || ''} onChange={handleChange} className="w-full border rounded p-2"/></FormRow>
              <FormRow label="ロゴURL"><input name="logoUrl" type="url" value={profile.logoUrl || ''} onChange={handleChange} className="w-full border rounded p-2" /></FormRow>
             <FormRow label="ヘッダー画像URL" description="公開企業ページの上部に表示される背景画像です。推奨サイズ: 1200x400px">
                <input name="headerImageUrl" type="url" value={profile.headerImageUrl || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </FormRow>
              {profile.headerImageUrl && (
                <div
                  ref={containerRef}
                  className="relative w-full h-48 bg-slate-200 rounded-md overflow-hidden cursor-grab active:cursor-grabbing"
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={handleDragStart}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                >
                  <img
                    ref={imageRef}
                    src={profile.headerImageUrl}
                    alt="ヘッダー画像プレビュー"
                    className="absolute w-full select-none"
                    style={{ top: '0px' }}
                    draggable="false"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white pointer-events-none">
                    <p>ドラッグして表示位置を調整</p>
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection title="通知先担当者情報">
              <FormRow label="担当者名">
                <input name="name" type="text" value={profile.contact?.name || ''} onChange={handleContactChange} className="w-full border rounded p-2"/>
              </FormRow>
              <FormRow label="担当者メールアドレス">
                <input name="email" type="email" value={profile.contact?.email || ''} onChange={handleContactChange} className="w-full border rounded p-2"/>
              </FormRow>
              <FormRow label="担当者電話番号">
                <input name="phone" type="tel" value={profile.contact?.phone || ''} onChange={handleContactChange} className="w-full border rounded p-2"/>
              </FormRow>
            </FormSection>

            <FormSection title="候補者へのアピール情報">
              <FormRow label="事業内容・会社説明"><textarea name="description" value={profile.description || ''} onChange={handleChange} className="w-full border rounded p-2" rows={5}/></FormRow>
              <FormRow label="ミッション"><textarea name="mission" value={profile.mission || ''} onChange={handleChange} className="w-full border rounded p-2" rows={3}/></FormRow>
              <FormRow label="福利厚生 (カンマ区切り)"><input name="employeeBenefits" type="text" value={profile.employeeBenefits?.join(', ') || ''} onChange={(e) => handleArrayChange(e, 'employeeBenefits')} className="w-full border rounded p-2"/></FormRow>
            </FormSection>

            <FormSection title="セキュリティ体制">
                <FormRow label="セキュリティチームの規模"><input name="securityTeamSize" type="text" value={profile.securityTeamSize || ''} onChange={handleChange} className="w-full border rounded p-2"/></FormRow>
                <div className="flex items-center gap-2 pt-2"><input id="hasCiso" name="hasCiso" type="checkbox" checked={!!profile.hasCiso} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="hasCiso">CISO設置済み</label></div>
                <div className="flex items-center gap-2"><input id="hasCsirt" name="hasCsirt" type="checkbox" checked={!!profile.hasCsirt} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="hasCsirt">CSIRT設置済み</label></div>
                <div className="flex items-center gap-2"><input id="isCsirtMember" name="isCsirtMember" type="checkbox" checked={!!profile.isCsirtMember} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="isCsirtMember">CSIRT協議会に参加</label></div>
                <div className="flex items-center gap-2"><input id="certificationSupport" name="certificationSupport" type="checkbox" checked={!!profile.certificationSupport} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="certificationSupport">資格取得支援制度あり</label></div>
                <FormRow label="取得セキュリティ認証 (カンマ区切り)"><input name="securityCertifications" type="text" value={profile.securityCertifications?.join(', ') || ''} onChange={(e) => handleArrayChange(e, 'securityCertifications')} className="w-full border rounded p-2"/></FormRow>
            </FormSection>

            <div className="flex justify-end pt-8">
                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-md shadow-sm disabled:opacity-50">
                    {isLoading ? '保存中...' : 'プロフィールを保存'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-4 text-right">{error}</p>}
          </form>
        )}
      </div>
    </Layout>
  );
};

export default CompanyProfilePage;
