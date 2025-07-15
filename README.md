# WorkerBee 🐝 - 複数人対応タスク管理アプリ

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)](https://app.netlify.com/sites/your-site-name/deploys)

複数人でリアルタイムに協力してタスク管理ができる、パソコンに詳しくない方でも簡単に使えるWebアプリケーションです。

## � 主な特徴

### 👥 **複数人でのリアルタイム協力**
- ユーザー登録・ログイン機能
- Socket.IOによるリアルタイム通知
- 他のユーザーにタスクを割り当て
- チーム全体のタスク状況を即座に同期

### 📊 **豊富な表示形式**
- **ダッシュボード**: 統計情報とタスク概要
- **タスクリスト**: 一覧表示・フィルタリング・検索
- **カレンダービュー**: 月・週・日単位でのタスク表示
- **ガントチャート**: プロジェクト進捗と依存関係の可視化

### 💾 **安全なデータ管理**
- Google Spreadsheet + Apps Script によるクラウドデータベース
- JWT認証による安全なログイン
- bcryptとハッシュ化によるパスワード暗号化
- セキュリティヘッダーによる保護

### 🎨 **美しいUI/UX**
- 蜂をイメージしたデザイン
- PC、スマホ、タブレットに対応
- 日本語フォント（Noto Sans JP）対応
- Font Awesomeアイコンによる直感的な操作
- スムーズなアニメーション効果

## �🌐 マルチ環境対応

このアプリケーションは**Node.jsサーバー**と**Netlify**の両方で動作します：

### 🔧 デプロイ方式

#### 開発環境（ローカル）
- **フロントエンド**: Node.js Express静的配信
- **バックエンド**: Node.js Express + Socket.IO
- **データベース**: Google Spreadsheet（GAS経由）
- **リアルタイム通信**: Socket.IO

#### 本番環境（Netlify）
- **フロントエンド**: Netlify（静的ホスティング + CDN）
- **バックエンド**: Google Apps Script（サーバーレス）
- **データベース**: Google Spreadsheet
- **リアルタイム通信**: 無効（静的環境のため）

### ⚙️ 自動環境判定

アプリケーションは実行環境を自動判定し、適切なAPI接続方法を選択します：

- **localhost/127.0.0.1**: 開発環境 → Node.jsサーバー使用
- **netlify.app**: 本番環境 → Google Apps Script使用

## 🚀 クイックスタート

### 前提条件
- Node.js 18.0.0以上
- npm または yarn
- Googleアカウント（スプレッドシート・Apps Script用）
- Google ChromeやMicrosoft Edge、BraveなどのWebブラウザ 
- **Git** または **GitHub Desktop**（開発に参加する場合）

### 🖥️ GitHub Desktopのセットアップ（初心者向け）

コマンドラインに慣れていない方は、GitHub Desktopを使用することをお勧めします：

1. **GitHub Desktopのインストール**
   - [GitHub Desktop](https://desktop.github.com/) にアクセス
   - "Download for Windows" をクリック
   - ダウンロードしたファイルを実行してインストール

2. **GitHubアカウントの連携**
   - GitHub Desktopを起動
   - "Sign in to GitHub.com" をクリック
   - ブラウザでGitHubにログイン
   - 認証を完了

3. **Gitの設定**
   - "Configure Git" で名前とメールアドレスを設定
   - これらの情報はコミット時に使用されます

4. **準備完了**
   - これでGitHub Desktopを使用してプロジェクトを管理できます

### ローカル開発

```bash
# リポジトリのクローン
git clone https://github.com/nohataku/WorkerBee.git
cd WorkerBee

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
# または本番モード
npm start

# ブラウザでアクセス
# http://localhost:3000
```

### Netlify デプロイ

#### 方法1: Git連携（推奨）

##### A. コマンドラインを使用する場合
```bash
git add .
git commit -m "Netlify対応"
git push origin main
```

##### B. GitHub Desktopを使用する場合
1. **GitHub Desktopを開く**
   - [GitHub Desktop](https://desktop.github.com/) をダウンロード・インストール
   - GitHubアカウントでログイン

2. **リポジトリをクローン**
   - "Clone a repository from the Internet" をクリック
   - `nohataku/WorkerBee` を検索して選択
   - ローカルパスを指定してクローン

3. **変更をコミット**
   - 左側のパネルで変更されたファイルを確認
   - 下部の "Summary" に分かりやすいコミットメッセージを入力
   - 例: "Add new feature: カレンダービュー機能追加"
   - "Commit to main" ボタンをクリック

4. **GitHubにプッシュ**
   - 右上の "Push origin" ボタンをクリック
   - 変更がGitHubリポジトリに反映される

5. **Netlify管理画面で設定**
- [Netlify](https://netlify.com) にアクセス
- "New site from Git" をクリック
- GitHubリポジトリを選択
- ビルド設定:
  - Build command: `npm run build:netlify`
  - Publish directory: `dist`
- Deploy site をクリック

#### 方法2: 手動デプロイ
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

### 🧪 環境テスト

- **ローカル**: `http://localhost:3000/test.html`
- **GitHub Pages**: `https://username.github.io/WorkerBee/test.html`
- **Netlify**: `https://your-site-name.netlify.app/test.html`

## � Google Apps Script 設定

### 1. Google Spreadsheet の準備
1. [Google Spreadsheet](https://docs.google.com/spreadsheets/) で新しいスプレッドシートを作成
2. 以下のシートを作成：
   - `Tasks`: タスクデータ用
   - `Users`: ユーザーデータ用

### 2. シート構造の設定

#### Tasks シート
```
A1: id | B1: title | C1: description | D1: priority | E1: status | F1: assignedTo | G1: dueDate | H1: startDate | I1: createdAt | J1: updatedAt | K1: dependencies
```

#### Users シート
```
A1: id | B1: username | C1: email | D1: password | E1: displayName | F1: createdAt | G1: updatedAt
```

### 3. Google Apps Script の設定
1. スプレッドシートで「拡張機能」→「Apps Script」を開く
2. `gas-code.js` の内容をコピー＆ペースト
3. スプレッドシートIDを `SPREADSHEET_ID` に設定
4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」として公開
5. 実行者を「自分」、アクセスできるユーザーを「全員」に設定
6. デプロイ後のURLを控えておく

### 4. フロントエンド設定の更新
`public/js/config.js` のGAS_URLを更新：
```javascript
const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
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
- **依存関係**: 他のタスクとの依存関係を設定

### 3. ダッシュボード
- 総タスク数、完了数、未完了数、期限切れ数の統計表示
- 最近のタスク一覧
- リアルタイム更新

### 4. カレンダービュー
- サイドバーから「カレンダー」を選択
- 月・週・日単位でタスクを表示
- 日付をクリックして新しいタスクを作成
- タスクをドラッグ&ドロップで期限変更

### 5. ガントチャート
- サイドバーから「ガントチャート」を選択
- プロジェクトの全体的な進捗を視覚化
- タスクの期間と依存関係を管理
- ズームイン/アウトでスケール調整

### 6. コラボレーション
- 他のユーザーがタスクを更新するとリアルタイム通知
- 複数ユーザーでの同時作業
- 検索・フィルタリング機能でタスク管理を効率化

## 🛠 技術スタック

### バックエンド
- **Node.js 18+** - サーバーランタイム
- **Express.js 4.18+** - Webアプリケーションフレームワーク
- **Socket.IO 4.7+** - リアルタイム通信
- **JWT 9.0+** - 認証トークン
- **bcryptjs 2.4+** - パスワードハッシュ化
- **Google Apps Script** - サーバーレスバックエンド
- **Google Spreadsheet** - クラウドデータベース

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - モダンスタイリング（Grid、Flexbox、アニメーション）
- **JavaScript (ES6+)** - 動的機能とモジュール設計
- **Socket.IO Client** - リアルタイム通信
- **FullCalendar 6.1+** - カレンダー機能
- **DHTMLX Gantt** - ガントチャート機能
- **Font Awesome 6.0+** - アイコンライブラリ
- **Noto Sans JP** - 日本語フォント

### セキュリティ
- **Helmet** - セキュリティヘッダー
- **CORS** - クロスオリジンリソース共有
- **Rate Limiting** - レート制限
- **Input Validation** - 入力値検証
- **express-validator** - サーバーサイドバリデーション

### 開発・デプロイ
- **Netlify** - 静的サイトホスティング
- **GitHub Actions** - CI/CD (今後実装予定)
- **ESLint** - コード品質管理 (今後実装予定)
- **Prettier** - コードフォーマット (今後実装予定)

## 🔒 セキュリティ機能

- **パスワード暗号化**: bcryptjsによる安全なハッシュ化
- **JWT認証**: トークンベースの認証システム
- **レート制限**: API呼び出し制限によるDoS攻撃対策
- **入力値検証**: SQLインジェクション・XSS対策
- **セキュリティヘッダー**: Helmetによる包括的保護
- **CORS設定**: 適切なクロスオリジン設定

## 📱 レスポンシブ対応

- **デスクトップ**: 1200px以上 - フル機能UI
- **タブレット**: 768px〜1199px - 最適化されたレイアウト
- **スマートフォン**: 767px以下 - モバイル専用UI

## 🚀 今後の機能拡張

- [ ] プロジェクト管理機能
- [ ] チーム管理機能
- [ ] タスクコメント機能
- [ ] ファイル添付機能
- [ ] プッシュ通知（PWA）
- [ ] 多言語対応（i18n）
- [ ] レポート・分析機能
- [ ] API ドキュメント（Swagger）
- [ ] 自動テスト（Jest）
- [ ] CI/CD パイプライン
## 🐛 トラブルシューティング

### よくある問題と解決法

#### 1. サーバーが起動しない
```bash
# ポートが使用中の場合
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# または別のポートを使用
set PORT=3001 && npm start
```

#### 2. Google Apps Script 接続エラー
- GAS のデプロイURLが正しいか確認
- スプレッドシートの共有設定を確認
- `gas-code.js` のスプレッドシートIDが正しいか確認

#### 3. 依存関係のエラー
```bash
# node_modulesを削除して再インストール
rmdir /s node_modules
del package-lock.json
npm install
```

#### 4. ライブラリ読み込みエラー
- ネットワーク接続を確認
- CDN のURLが正しいか確認
- ブラウザのキャッシュをクリア

#### 5. Netlify デプロイエラー
- ビルドコマンドが正しいか確認: `npm run build:netlify`
- Node.js バージョンが18以上か確認
- 環境変数が正しく設定されているか確認

#### 6. GitHub Desktop関連のトラブル
- **プッシュできない**
  - 認証が切れている可能性があります
  - "File" → "Options" → "Accounts" で再認証
  
- **同期エラー**
  - "Repository" → "Pull" で最新の変更を取得
  - コンフリクトがある場合は手動で解決
  
- **ブランチが見つからない**
  - "Branch" → "Update from main" で最新のブランチ情報を取得
  
- **コミットできない**
  - 変更内容を確認して、適切なコミットメッセージを入力
  - 大きすぎるファイルがある場合は `.gitignore` を確認

### デバッグ方法

#### 1. ブラウザ開発者ツール
- `F12` キーで開発者ツールを開く
- Console タブでエラーメッセージを確認
- Network タブでAPI通信を確認

#### 2. サーバーログ
```bash
# 開発モードでサーバーを起動
npm run dev
```

#### 3. テストページの利用
- `http://localhost:3000/test.html` でAPI接続をテスト
- `http://localhost:3000/debug.html` でデバッグ情報を確認

### パフォーマンス最適化

#### 1. 画像の最適化
- ロゴ画像を適切なサイズに圧縮
- WebP形式の使用を検討

#### 2. JavaScript の最適化
- 不要なライブラリの削除
- コードの圧縮化（今後実装予定）

#### 3. CSS の最適化
- 未使用のスタイルを削除
- CSS の圧縮化（今後実装予定）

## 🤝 コントリビューション

### 貢献の方法

1. **Issue の報告**
   - バグ報告
   - 機能要求
   - 改善提案

2. **プルリクエスト**
   - フォークしてブランチを作成
   - 変更を実装
   - テストを追加
   - プルリクエストを送信

3. **コード規約**
   - ESLint 設定に従う（今後実装予定）
   - 適切なコメントを追加
   - 変更内容を明確に記述

### 開発手順

#### A. コマンドラインを使用する場合
```bash
# 1. フォークしてクローン
git clone https://github.com/your-username/WorkerBee.git
cd WorkerBee

# 2. 依存関係のインストール
npm install

# 3. 開発ブランチの作成
git checkout -b feature/new-feature

# 4. 変更の実装
# コードを編集...

# 5. テストの実行
npm test

# 6. コミット
git add .
git commit -m "Add new feature: 機能の説明"

# 7. プッシュ
git push origin feature/new-feature

# 8. プルリクエストの作成
# GitHub でプルリクエストを送信
```

#### B. GitHub Desktopを使用する場合
1. **フォークとクローン**
   - GitHubでWorkerBeeリポジトリをフォーク
   - GitHub Desktopで "Clone a repository from the Internet" を選択
   - 自分のフォークしたリポジトリを選択してクローン

2. **依存関係のインストール**
   ```bash
   cd WorkerBee
   npm install
   ```

3. **新しいブランチの作成**
   - GitHub Desktopで "Current branch" をクリック
   - "New branch" を選択
   - ブランチ名を入力（例: `feature/new-feature`）
   - "Create branch" をクリック

4. **変更の実装**
   - VS Codeやお好みのエディタでコードを編集
   - GitHub Desktopで変更内容を確認

5. **コミット**
   - 左側のパネルで変更されたファイルを確認
   - 下部の "Summary" に分かりやすいコミットメッセージを入力
   - 例: "Add new feature: ガントチャート機能の改善"
   - "Commit to feature/new-feature" ボタンをクリック

6. **プッシュ**
   - 右上の "Push origin" ボタンをクリック
   - ブランチがGitHubにプッシュされる

7. **プルリクエストの作成**
   - GitHub Desktopで "Create Pull Request" ボタンをクリック
   - ブラウザでGitHubが開く
   - プルリクエストの詳細を記入して送信

#### C. GitHub Desktopの便利な機能
- **ブランチ切り替え**: "Current branch" から簡単に切り替え
- **変更の確認**: 左側パネルで変更内容を視覚的に確認
- **コミット履歴**: "History" タブで過去のコミットを確認
- **同期**: 右上の "Fetch origin" で最新の変更を取得
- **コンフリクト解決**: マージコンフリクトを視覚的に解決

## 📊 プロジェクトの統計

- **総行数**: 約5,000行
- **JavaScript**: 約3,000行
- **CSS**: 約1,500行
- **HTML**: 約500行
- **ファイル数**: 約20ファイル

## 📝 更新履歴

### v1.0.0 (2025年7月)
- 基本的なタスク管理機能
- ユーザー認証システム
- リアルタイム通信
- カレンダービュー
- ガントチャート
- レスポンシブデザイン
- Netlify対応

### 今後の予定
- v1.1.0: プロジェクト管理機能
- v1.2.0: チーム管理機能
- v1.3.0: PWA対応
- v2.0.0: 多言語対応

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

```
MIT License

Copyright (c) 2025 WorkerBee Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 開発者

- **開発者**: [@nohataku](https://github.com/nohataku)
- **Email**: nohara.takuto@zequt.com
- **Twitter**: [@nohataku](https://twitter.com/nohataku)

## 🔗 関連リンク

- [プロジェクトリポジトリ](https://github.com/nohataku/WorkerBee)
- [デモサイト](https://nohataku-workerbee.netlify.app/)
- [Issues](https://github.com/nohataku/WorkerBee/issues)
- [Wiki](https://github.com/nohataku/WorkerBee/wiki)

---

**💡 ヒント**: 本番環境では、環境変数を適切に設定し、HTTPS を使用することを強く推奨します。セキュリティを最優先に考慮してください。

**🐝 WorkerBee で効率的なタスク管理を始めましょう！**
