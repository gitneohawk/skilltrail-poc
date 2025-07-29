// pages/auth/signin.tsx

import { useState, FormEvent, useEffect } from 'react'; // useEffect をインポート
import { signIn, getProviders, useSession } from 'next-auth/react'; // useSession をインポート
import { useRouter } from 'next/router'; // useRouter をインポート
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import Layout from '@/components/Layout';

export default function SignIn({ providers }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ★★★ ここからが修正の核心部分 ★★★
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // もし、すでに認証済み（ログイン済み）の状態であれば、
    // 本来行くべきだったページ (callbackUrl) にリダイレクトする
    if (status === 'authenticated') {
      const callbackUrl = router.query.callbackUrl as string | undefined;
      router.push(callbackUrl || '/'); // callbackUrlがなければトップページへ
    }
  }, [status, router]);
  // ★★★ ここまでが修正の核心部分 ★★★

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    const result = await signIn('email', {
      email,
      redirect: false,
      callbackUrl: router.query.callbackUrl as string | undefined || '/',
    });
    if (result?.error) {
      console.error(result.error);
      setMessage('エラーが発生しました。もう一度お試しください。');
    } else {
      setMessage('確認メールを送信しました。メールボックスをご確認ください。');
    }
    setIsLoading(false);
  };

  // 認証状態を確認中は、ローディング画面を表示
  if (status === 'loading') {
    return <Layout><p className="text-center p-8">読み込み中...</p></Layout>;
  }

  // 認証済みの場合も、リダイレクトが走るまでの間ローディング画面を表示
  if (status === 'authenticated') {
    return <Layout><p className="text-center p-8">リダイレクト中...</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">サインイン</h1>
        <div className="space-y-6 bg-white p-8 rounded-lg shadow-md border">

          {/* Email Sign-In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.name@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 disabled:opacity-50"
            >
              {isLoading ? '送信中...' : 'メールでサインイン'}
            </button>
            {message && <p className="text-sm text-center text-slate-600 pt-2">{message}</p>}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          {/* Other Providers (e.g., Azure AD) */}
          {Object.values(providers).map((provider) => {
            if (provider.id === 'email') return null;
            return (
              <div key={provider.name}>
                <button
                  onClick={() => signIn(provider.id)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {provider.name} でサインイン
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

// サーバーサイドで利用可能なプロバイダーを取得する
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const providers = await getProviders();

  return {
    props: { providers: providers ?? [] },
  }
}
