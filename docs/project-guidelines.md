# Project Guidelines

## 概要
本プロジェクトはNext.js(TypeScript)＋Azure Static Web Apps構成のセキュリティ人材向けAIサービスPoCです。

## ディレクトリ構成
- `src/` ... アプリ本体
- `public/` ... 静的ファイル
- `docs/` ... ドキュメント（本ファイル含む）
- `package.json` ... 依存・スクリプト
- `.env.local` ... ローカル用環境変数

## 開発・運用フロー
1. ローカルで `npm install` → `npm run dev` で動作確認
2. Azure Static Web Appsへデプロイ（GitHub Actions推奨）
3. 環境変数はAzureポータルで設定

## Azure移行時の注意
- API Routeは `/api/` 配下でFunctions化される
- 認証Callback URLや環境変数は本番用に修正
- `staticwebapp.config.json` でルーティング・認証制御

## 参考
- `handover.md` も参照
- 詳細はREADMEまたは本ディレクトリ内に追記
