# Handover（引き継ぎ・運用メモ）

## 概要
- 本プロジェクトはNext.js(TypeScript)＋Azure Static Web Apps構成
- API Routeは `/api/` 配下でFunctions化
- Azure Blob, OpenAI, NextAuth, i18next等を利用

## 運用・デプロイ
- ローカル: `npm install` → `npm run dev`
- 本番: GitHub ActionsまたはAzure CLIでSWAデプロイ
- 環境変数はAzureポータルで管理（`.env.local`はローカル専用）

## 認証・環境変数
- `NEXTAUTH_URL` などは本番URLに合わせて設定
- Azure AD認証情報、OpenAIキー、Blob接続文字列などは漏洩注意

## ドキュメント管理
- `docs/`配下にガイドライン・運用メモを集約
- 追加ドキュメントはこのディレクトリに格納

## 参考
- `project-guidelines.md` も参照
- 技術的な詳細や運用Tipsは随時追記
