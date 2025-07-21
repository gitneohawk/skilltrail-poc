// src/lib/app-insights.ts

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// appInsightsのインスタンスをシングルトンとして保持するための変数
let appInsights: ApplicationInsights | null = null;

/**
 * Application Insightsのインスタンスを取得または初期化する関数。
 * ブラウザ環境でのみ、かつ接続文字列が存在する場合にのみ初期化処理を行う。
 * @returns ApplicationInsightsのインスタンス、またはnull
 */
export const getAppInsights = (): ApplicationInsights | null => {
  // 既にインスタンスが存在すれば、それを返す（複数回の初期化を防ぐ）
  if (appInsights) {
    return appInsights;
  }

  // ブラウザ環境（windowが存在する）かつ、環境変数が設定されている場合のみ実行
  if (
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING
  ) {
    // 新しいインスタンスを作成
    appInsights = new ApplicationInsights({
      config: {
        connectionString:
          process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING,
        // Next.jsのルーターと連携し、ページ遷移を自動で追跡する
        enableAutoRouteTracking: true,
      },
    });

    // Application Insightsの監視を開始
    appInsights.loadAppInsights();

    return appInsights;
  }

  // 条件を満たさない場合はnullを返す
  return null;
};
