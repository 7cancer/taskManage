# taskManage

オフラインタスク管理Webアプリの実装リポジトリ。

## 開発環境セットアップ（TypeScript + Vite）

```bash
npm install
npm run dev
```

## GitHub ZIP運用から `git pull` 運用へ移行する手順

GitHub から ZIP を毎回ダウンロードしている場合は、最初に一度だけ Git リポジトリとして接続すると、以降は `git pull` で更新できます。

### 1) Git のインストール確認

```bash
git --version
```

### 2) ZIP展開済みディレクトリでセットアップスクリプトを実行

#### macOS / Linux / Git Bash

```bash
./scripts/setup-git-from-zip.sh https://github.com/7cancer/taskManage.git main
```

#### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-from-zip.ps1 -RepoUrl https://github.com/7cancer/taskManage.git -Branch main
```

- 第1引数: GitHub リポジトリ URL
- 第2引数: 追従したいブランチ名（省略時は `main`）
- `origin` リモートが未設定でも、スクリプト実行時に自動で追加されます。

### 3) 初回セットアップできたか確認

```bash
git rev-parse --is-inside-work-tree
git remote -v
git branch -vv
```

`true` が表示され、`origin` が設定され、対象ブランチに `origin/<branch>` の追跡情報があればセットアップ成功です。

※ `origin does not appear to be a git repository` が出る場合は、`-RepoUrl`/第1引数の URL を再確認してください（例: `https://github.com/7cancer/taskManage.git`）。

### 4) 日常の更新

```bash
git pull
```

### 5) 初回のみ依存関係を再取得

```bash
npm install
```

## 主要スクリプト

- `npm run dev`: 開発サーバ起動
- `npm run build`: TypeScriptビルド + Viteビルド
- `npm run typecheck`: 型チェック
- `npm run lint`: ESLint

## 現在の状態

- `src/` に機能別の空ファイルひな型を配置済み
- 各ファイルに interface/type と TODO コメントを付与
- 次ステップは CSV 取込 → カンバン → ガントの順で実装予定
