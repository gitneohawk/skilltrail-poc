// company/mypage.tsx

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import type { CompanyProfile } from '@/types/CompanyProfile'; // 型は適宜調整

const CompanyMypage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 認証済みのユーザーのみデータ取得を実行
    if (status === 'authenticated') {
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/company/profile', {
            method: 'GET',
            credentials: 'include', // セッションクッキーを送信するために必要
          });

          if (response.ok) {
            const data = await response.json();
            setProfile(data);
          } else {
            // プロフィールが存在しない場合 (404)
            setProfile(null);
          }
        } catch (error) {
          console.error('Error fetching company profile:', error);
          setProfile(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }

    if (status === 'unauthenticated') {
        setIsLoading(false);
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <p className="text-center p-8">Loading...</p>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">企業マイページ</h1>
          <p>このページを閲覧するにはログインが必要です。</p>
          <button
            onClick={() => signIn('azure-ad')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            ログイン
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">企業マイページ</h1>
        {profile ? (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
　　　　　　　<h2 className="text-xl font-semibold">{profile.name}</h2>
            <p><strong>業界:</strong> {profile.industry}</p>
            <p><strong>会社説明:</strong> {profile.description}</p>


            <button
              onClick={() => router.push('/company/profile')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              プロフィールを編集
            </button>
          </div>
        ) : (
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <p>プロフィールがまだ登録されていません。</p>
            <button
              onClick={() => router.push('/company/profile')}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              登録ページへ
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyMypage;
