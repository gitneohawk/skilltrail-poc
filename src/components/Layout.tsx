// components/Layout.tsx

import { FC, ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

type Props = {
  children: ReactNode;
  title?: string;
};

const Layout: FC<Props> = ({ children, title = 'skilltrail' }) => {
  // useSessionフックを使って、現在のログイン状態を取得
  const { data: session, status } = useSession();

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Head>
        <title>{title}</title>
        <meta name="description" content="A platform for security engineers" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ★★★ ここからが修正箇所 ★★★ */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左側のロゴ */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-slate-800 hover:text-blue-600">
                skilltrail
              </Link>
            </div>

            {/* 右側のナビゲーション */}
            <div className="flex items-center gap-4">
              {/* ログインしている場合のみ、ユーザーメニューとサインアウトボタンを表示 */}
              {status === 'authenticated' && session.user && (
                <>
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="h-6 w-6 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 hidden sm:block">
                      {session.user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                    title="サインアウト"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="hidden sm:block">サインアウト</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* ★★★ ここまでが修正箇所 ★★★ */}

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-slate-800 text-slate-400 text-sm">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} skilltrail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
