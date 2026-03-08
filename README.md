# taskManage

オフラインタスク管理Webアプリの実装リポジトリ。

## 開発環境セットアップ（TypeScript + Vite）

```bash
npm install
npm run dev
```

## ローカルの空フォルダから `git pull` できる状態を作る手順

> 前提: この手順は **空の作業フォルダ** で実行してください。

### 1) Git のインストール確認

```bash
git --version
```

### 2) 空フォルダを作って移動

#### macOS / Linux / Git Bash

```bash
mkdir taskManage
cd taskManage
```

#### Windows PowerShell

```powershell
mkdir taskManage
cd taskManage
```

### 3) Git リポジトリを初期化し、`origin` を設定

```bash
git init
git remote add origin https://github.com/7cancer/taskManage.git
```

### 4) `main` ブランチを取得して追跡設定

```bash
git fetch origin main
git checkout -b main --track origin/main
```

### 5) 以降の更新（`git pull`）

```bash
git pull
```

### 6) 動作確認

```bash
git remote -v
git branch -vv
```

`origin` が表示され、`main` が `origin/main` を追跡していればOKです。

## 主要スクリプト

- `npm run dev`: 開発サーバ起動
- `npm run build`: TypeScriptビルド + Viteビルド
- `npm run typecheck`: 型チェック
- `npm run lint`: ESLint

## 現在の状態

- `src/` に機能別の空ファイルひな型を配置済み
- 各ファイルに interface/type と TODO コメントを付与
- 次ステップは CSV 取込 → カンバン → ガントの順で実装予定
