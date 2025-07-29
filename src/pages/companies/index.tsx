// pages/companies/index.tsx

import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { BuildingOffice2Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const CompanyIndexPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 認証状態を監視し、ログイン済みならマイページにリダイレクト
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/companies/mypage');
    }
  }, [status, router]);

  // 認証状態を確認中のローディング画面
  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  // 認証されていない場合のみ、選択画面を表示
  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className="bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                企業様向けポータル
              </h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
                skilltrailへようこそ。日本の未来を担うセキュリティ人材の育成にご協力いただき、ありがとうございます。
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 新規利用申請カード */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="flex-shrink-0">
                  <BuildingOffice2Icon className="h-10 w-10 text-blue-600" aria-hidden="true" />
                </div>
                <div className="flex-grow mt-6">
                  <h2 className="text-xl font-semibold text-slate-900">初めてご利用の企業様</h2>
                  <p className="mt-2 text-base text-slate-600">
                    まずは利用申請フォームからご連絡ください。運営にて確認後、担当者様にご連絡いたします。
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/companies/apply')}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    新規利用を申請する
                  </button>
                </div>
              </div>

              {/* 既存ユーザーログインカード */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="flex-shrink-0">
                  <ArrowRightOnRectangleIcon className="h-10 w-10 text-green-600" aria-hidden="true" />
                </div>
                <div className="flex-grow mt-6">
                  <h2 className="text-xl font-semibold text-slate-900">登録済みの企業様</h2>
                  <p className="mt-2 text-base text-slate-600">
                    運営より承認済みの担当者様、または既存メンバーの方はこちらからログインしてください。
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => signIn()}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 w-full"
                  >
                    ログイン
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // デフォルトでは何も表示しない（リダイレクト待ちのため）
  return null;
};

export default CompanyIndexPage;
