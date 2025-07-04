// 1. src/lib/app-insights.ts の内容を以下に置き換える

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights: ApplicationInsights | null = null;

/**
 * Application Insightsのインスタンスをシングルトンとして作成または取得します。
 * 接続文字列が見つからない場合はnullを返します。
 */
export const getAppInsights = (): ApplicationInsights | null => {
  // 既にインスタンスがあれば、それを返す
  if (appInsights) {
    return appInsights;
  }

  // 環境変数から接続文字列を取得
  const connectionString = process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;

  // 接続文字列が存在する場合のみ、インスタンスを作成して初期化
  if (connectionString) {
    appInsights = new ApplicationInsights({
      config: {
        connectionString: connectionString,
        enableAutoRouteTracking: true, // Next.jsのページ遷移を自動で追跡
      }
    });
    appInsights.loadAppInsights();
    return appInsights;
  }

  // 接続文字列がなければ、nullを返す
  return null;
};
