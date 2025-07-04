import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    // この環境変数は、Azure SWAの構成から自動で読み込まれます
    connectionString: process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true, // ページ遷移を自動で追跡
  }
});

if (typeof window !== 'undefined') {
  appInsights.loadAppInsights();
  appInsights.trackPageView(); // 最初のページビューを追跡
}

export { appInsights };
