// src/pages/_app.tsx

import type { AppProps } from 'next/app';
import { SessionProvider } from "next-auth/react";
import '../styles/globals.css';
import { useEffect } from 'react';
import { getAppInsights } from '@/lib/app-insights';

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {

  useEffect(() => {
    // アプリケーションの初回マウント時に、安全な方法でApp Insightsを初期化
    getAppInsights();
  }, []);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
