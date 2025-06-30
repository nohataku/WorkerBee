# Tasker アプリケーション デプロイメント設定

## 本番環境用 .env ファイル

```bash
# 本番環境設定
NODE_ENV=production
PORT=3000

# MongoDB Atlas（本番用）
MONGODB_URI=mongodb+srv://nohataku:CY8200yOhXDCvrUI@tasker.vgo1a5x.mongodb.net/tasker-production?retryWrites=true&w=majority&appName=Tasker

# セキュリティ設定（本番環境では必ず変更）
JWT_SECRET=production-jwt-secret-very-long-and-secure-change-this
JWT_EXPIRES_IN=7d
SESSION_SECRET=production-session-secret-very-long-and-secure-change-this

# アプリケーション設定
APP_NAME=Tasker Multi-User
APP_URL=https://your-domain.com

# セキュリティ設定
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=2h
```

## Heroku デプロイメント

### 1. Heroku CLI インストール
```bash
# Heroku CLI をダウンロードしてインストール
# https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Heroku アプリケーション作成
```bash
heroku create your-tasker-app-name
```

### 3. 環境変数設定
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://nohataku:CY8200yOhXDCvrUI@tasker.vgo1a5x.mongodb.net/tasker-production?retryWrites=true&w=majority&appName=Tasker"
heroku config:set JWT_SECRET="your-production-jwt-secret"
heroku config:set SESSION_SECRET="your-production-session-secret"
```

### 4. デプロイ
```bash
git add .
git commit -m "Ready for production deployment"
git push heroku main
```

## Vercel デプロイメント

### 1. Vercel CLI インストール
```bash
npm i -g vercel
```

### 2. デプロイ設定
```bash
vercel --prod
```

### 3. 環境変数設定
- Vercel ダッシュボードで環境変数を設定
- または vercel.json で設定

## Railway デプロイメント

### 1. Railway アカウント作成
- https://railway.app でアカウント作成

### 2. GitHub リポジトリ接続
- プロジェクトをGitHubにプッシュ
- Railway でリポジトリを接続

### 3. 環境変数設定
- Railway ダッシュボードで環境変数を設定

## 重要な注意事項

### セキュリティ
- JWT_SECRET と SESSION_SECRET は必ず本番用の強力なキーに変更
- MongoDB Atlas のIPホワイトリストを適切に設定
- HTTPS を有効にする

### MongoDB Atlas設定
1. Atlas ダッシュボード > Network Access
2. IP アドレス 0.0.0.0/0 を追加（すべてのIPを許可）
3. または特定のデプロイ先IPを追加

### パフォーマンス
- NODE_ENV=production に設定
- 適切なログレベル設定
- エラーハンドリングの強化
