# Netlify デプロイガイド

## 🚀 Netlifyへのデプロイ手順

### 1. Netlifyアカウントの準備
1. [Netlify](https://netlify.com) にアクセス
2. GitHubアカウントでサインアップ/ログイン

### 2. サイトの作成
1. Netlify管理画面で「New site from Git」をクリック
2. GitHub を選択
3. リポジトリ「WorkerBee」を選択

### 3. ビルド設定
```
Build command: npm run build:netlify
Publish directory: dist
```

### 4. 環境変数（必要に応じて）
Netlify管理画面 > Site settings > Environment variables で設定:
```
NODE_VERSION=18
```

### 5. カスタムドメイン（オプション）
- Netlify管理画面 > Domain management
- 独自ドメインを設定可能

## 📋 自動デプロイ
- mainブランチへのpush時に自動デプロイ
- プレビューデプロイ: Pull Request作成時

## 🔧 設定ファイル
- `netlify.toml`: Netlify設定
- `public/_redirects`: リダイレクト設定
- `package.json`: ビルドコマンド

## 🌐 アクセス URL
デプロイ後、以下の形式でアクセス可能:
```
https://[サイト名].netlify.app
```

## 🔍 デバッグ
デプロイログは Netlify管理画面 > Deploys で確認可能
