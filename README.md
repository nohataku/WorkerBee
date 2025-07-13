# WorkerBee - 複数人対応タスク管理アプリ

複数人でリアルタイムに協力してタスク管理ができる、パソコンに詳しくない方でも簡単に使えるWebアプリケーションです。

## 🌐 マルチ環境対応

このアプリケーションは**Node.jsサーバー**と**Netlify**の両方で動作します：

### 🔧 デプロイ方式

#### 開発環境（ローカル）
- **フロントエンド**: Node.js Express静的配信
- **バックエンド**: Node.js Express + Socket.IO
- **データベース**: Google Spreadsheet（GAS経由）
- **リアルタイム通信**: Socket.IO ✅

#### 本番環境（Netlify）
- **フロントエンド**: Netlify（静的ホスティング + CDN）
- **バックエンド**: Google Apps Script（サーバーレス）
- **データベース**: Google Spreadsheet
- **リアルタイム通信**: 無効（静的環境のため）

### ⚙️ 自動環境判定

アプリケーションは実行環境を自動判定し、適切なAPI接続方法を選択します：

- **localhost/127.0.0.1**: 開発環境 → Node.jsサーバー使用
- **netlify.app**: 本番環境 → Google Apps Script使用

### 🚀 起動方法

#### ローカル開発
```bash
npm install
npm start
# http://localhost:3000 でアクセス
```

#### Netlify デプロイ

##### 方法1: Git連携（推奨）
1. コードをGitHubにプッシュ
```bash
git add .
git commit -m "Netlify対応"
git push origin main
```

2. Netlify管理画面で設定
- [Netlify](https://netlify.com) にアクセス
- "New site from Git" をクリック
- GitHubリポジトリを選択
- ビルド設定:
  - Build command: `npm run build:netlify`
  - Publish directory: `dist`
- Deploy site をクリック

##### 方法2: 手動デプロイ
```bash
# ビルド実行
npm run build:netlify

# distフォルダをNetlifyにドラッグ&ドロップ
```

### 📦 ビルド設定

Netlifyでは以下の設定が自動適用されます：
- **Build Command**: `npm run build:netlify`
- **Publish Directory**: `dist`
- **Node Version**: 18
- **SPA Redirect**: `/*` → `/index.html`
```

#### ローカルでGitHub Pages環境をテスト
```bash
npm run pages:local
# http://localhost:8080/WorkerBee/ でアクセス
```

### 🧪 環境テスト

- **ローカル**: `http://localhost:3000/test.html`
- **GitHub Pages**: `https://username.github.io/WorkerBee/test.html`

## 🌟 主な特徴

### 👥 **複数人対応**
- ユーザー登録・ログイン機能
- リアルタイム通知（Socket.IO）
- 他のユーザーにタスクを割り当て
- チーム全体のタスク管理

### 💾 **データベース管理**
- Google Spreadsheet + Apps Script によるクラウドデータベース
- ユーザー情報とタスクデータの永続化
- セキュアな認証システム（JWT）
- Googleアカウントによる安全なデータ管理

### 🎨 **美しいユーザーインターフェース**
- モダンでレスポンシブなデザイン
- 直感的なダッシュボード
- リアルタイム統計表示
- スムーズなアニメーション

### ⚡ **高度な機能**
- タスクの優先度設定
- 期限管理と期限切れアラート
- 検索・フィルタリング機能
- リアルタイム同期
- **カレンダービュー**: タスクを月・週・日単位で視覚的に表示
- **ガントチャート**: プロジェクトの進捗とタスクの依存関係を管理

## 🚀 セットアップ

### 必要な環境
- Node.js (v14以上)
- Googleアカウント（スプレッドシート・Apps Script用）
- 現代的なWebブラウザ

### インストール手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd workerbee
```

2. **依存関係のインストール**
```bash
npm install
```

3. **Google Apps Script の設定**
   - 新しいGoogleスプレッドシートを作成
   - `Tasks` と `Users` のシートを作成
   - Apps Scriptをウェブアプリとしてデプロイ
   - サービス内の GAS URL を更新
   
   詳細は `services/gasService.js` のコメントを参照

3. **環境変数の設定**
`.env` ファイルを編集して、以下の項目を設定：
```env

# JWT秘密鍵（本番環境では安全な値に変更）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# サーバーポート
PORT=3000
```

4. **サーバーの起動**
```bash
# 開発モード
npm run dev

# 本番モード
npm start
```

5. **ブラウザでアクセス**
```
http://localhost:3000
```

## 📁 プロジェクト構成

```
WorkerBee/
├── server.js              # メインサーバーファイル
├── package.json           # プロジェクト設定と依存関係
├── .env                   # 環境変数設定
├── models/                # データベースモデル
│   ├── User.js           # ユーザーモデル
│   ├── Task.js           # タスクモデル
│   └── Project.js        # プロジェクトモデル
├── routes/                # APIルート
│   ├── auth.js           # 認証API
│   ├── tasks.js          # タスクAPI
│   └── users.js          # ユーザーAPI
├── middleware/            # Express ミドルウェア
│   └── auth.js           # 認証ミドルウェア
└── public/                # フロントエンドファイル
    ├── index.html         # メインHTML
    ├── css/
    │   └── styles.css     # スタイルシート
    └── js/
        └── app.js         # フロントエンドJavaScript
```

## 📂 プロジェクト構造 (2025年7月更新)

### フロントエンド構造
```
public/
├── js/
│   ├── api/
│   │   └── ApiClient.js          # API通信のラッパークラス
│   ├── managers/
│   │   ├── AuthManager.js        # 認証管理
│   │   ├── TaskManager.js        # タスク管理
│   │   ├── UIManager.js          # UI制御
│   │   ├── EventManager.js       # イベント管理
│   │   ├── NotificationManager.js# 通知管理
│   │   └── SocketManager.js      # WebSocket通信管理
│   ├── utils/
│   │   ├── PasswordUtils.js      # パスワード暗号化
│   │   └── TaskUtils.js          # タスク関連ユーティリティ
│   ├── WorkerBeeApp.js           # メインアプリケーションクラス
│   └── app.js.backup             # 旧バージョン（参考用）
├── css/
│   └── styles.css                # スタイルシート
└── index.html                    # メインHTMLファイル
```

### バックエンド構造
```
./
├── server.js                     # Express.jsメインサーバー
├── routes/
│   ├── auth.js                   # 認証API
│   ├── tasks.js                  # タスクAPI
│   └── users.js                  # ユーザーAPI
├── middleware/
│   └── auth.js                   # 認証ミドルウェア
└── services/
    └── gasService.js             # Google Apps Script連携
```

### 📋 **コード分割の利点**

1. **可読性向上**: 各機能が独立したファイルに分離され、理解しやすい
2. **保守性向上**: 特定の機能を修正する際、該当ファイルのみ編集すればよい
3. **再利用性**: 各マネージャークラスは独立しており、他のプロジェクトでも再利用可能
4. **テスト容易性**: 各クラスを個別にテストできる
5. **チーム開発**: 複数の開発者が異なるファイルを同時に編集可能

## 🎯 使い方

### 1. アカウント作成
- アプリにアクセスして「新規登録」をクリック
- ユーザー名、メールアドレス、表示名、パスワードを入力
- 登録完了後、自動的にログイン

### 2. タスク管理
- **新しいタスク**: 「新しいタスク」ボタンからタスク作成
- **タスク割り当て**: 他のユーザーを検索して担当者を設定
- **優先度設定**: 低・中・高・緊急から選択
- **期限設定**: 期限日時を設定（オプション）

### 3. ダッシュボード
- 総タスク数、完了数、未完了数、期限切れ数の統計表示
- 最近のタスク一覧
- リアルタイム更新

### 4. コラボレーション
- 他のユーザーがタスクを更新するとリアルタイム通知
- タスクのコメント機能（今後実装予定）
- プロジェクト管理（今後実装予定）

### 5. カレンダービュー
- サイドバーから「カレンダー」を選択
- 月・週・日単位でタスクを表示
- 日付をクリックして新しいタスクを作成
- タスクをドラッグ&ドロップで期限変更

### 6. ガントチャート
- サイドバーから「ガントチャート」を選択
- プロジェクトの全体的な進捗を視覚化
- タスクの期間と依存関係を管理
- ズームイン/アウトでスケール調整

## 🛠 技術スタック

### バックエンド
- **Node.js** - サーバーランタイム
- **Express.js** - Webアプリケーションフレームワーク
- **Socket.IO** - リアルタイム通信
- **JWT** - 認証トークン
- **bcryptjs** - パスワードハッシュ化

### フロントエンド
- **HTML5** - マークアップ
- **CSS3** - スタイリング（Grid、Flexbox、アニメーション）
- **JavaScript (ES6+)** - 動的機能
- **Socket.IO Client** - リアルタイム通信
- **FullCalendar** - カレンダー機能
- **DHTMLX Gantt** - ガントチャート機能
- **Font Awesome** - アイコン
- **Google Fonts** - 日本語フォント

### セキュリティ
- **Helmet** - セキュリティヘッダー
- **CORS** - クロスオリジンリソース共有
- **Rate Limiting** - レート制限
- **Input Validation** - 入力値検証

## 🔒 セキュリティ機能

- パスワードの暗号化保存
- JWT トークンベース認証
- ログイン試行回数制限
- SQLインジェクション対策
- XSS（Cross-Site Scripting）対策
- CSRF（Cross-Site Request Forgery）対策

## 📱 レスポンシブ対応

- デスクトップ（1200px以上）
- タブレット（768px〜1199px）
- スマートフォン（767px以下）

## 🚀 今後の機能拡張

- [ ] プロジェクト管理機能
- [ ] ファイル添付機能
- [x] カレンダービュー
- [x] ガントチャート
- [ ] チーム管理機能
- [ ] メール通知
- [ ] モバイルアプリ（PWA）
- [ ] 多言語対応
- [ ] レポート・分析機能

## 🐛 トラブルシューティング

### ポートが使用中
```bash
# 別のポートを使用
PORT=3001 npm start
```

### 依存関係のエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

## 🤝 コントリビューション

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は `LICENSE` ファイルを参照してください。

## 👨‍💻 開発者

- GitHub: [@nohataku](https://github.com/nohataku)
- Email: nohara.takuto@zequt.com

---

**💡 ヒント**: 本番環境では、`.env` ファイルの値を安全なものに変更し、HTTPS を使用することを強く推奨します。
task management tool
