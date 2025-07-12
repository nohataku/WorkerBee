# WorkerBee - 複数人対応タスク管理アプリ

複数人でリアルタイムに協力してタスク管理ができる、パソコンに詳しくない方でも簡単に使えるWebアプリケーションです。

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
- [ ] カレンダービュー
- [ ] ガントチャート
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
