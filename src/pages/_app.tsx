import type { AppProps } from 'next/app';
import { SessionProvider } from "next-auth/react";
import '../styles/globals.css';
import { useEffect } from 'react';
import { appInsights } from '@/lib/app-insights'; // 作成したファイルをインポート

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {

  // Application Insightsの初期化処理
  useEffect(() => {
    // NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING が設定されている場合のみ実行
    if (process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING) {
      appInsights.loadAppInsights();
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
