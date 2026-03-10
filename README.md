# taskManage

オフラインタスク管理Webアプリの実装リポジトリ。

## 前提環境

- **開発環境**: Windows 11 + Docker
- **ビルド済み成果物の動作環境**: Windows 11 ローカル

## 開発環境セットアップ（Windows 11 + Docker）

PowerShellでリポジトリ直下に移動した状態で、以下を実行します。

```powershell
docker run --rm -it `
  -v "${PWD}:/app" `
  -w /app `
  -p 5173:5173 `
  node:24-alpine sh -lc "npm install && npm run dev -- --host 0.0.0.0"
```

ブラウザで `http://localhost:5173` を開くと開発版を確認できます。

## 主要スクリプト

- `npm run dev`: 開発サーバ起動
- `npm run build`: TypeScriptビルド + Viteビルド
- `npm run typecheck`: 型チェック
- `npm run lint`: ESLint
- `npm run build:zip`: 配布用ZIPを作成

## 配布用ZIP作成（Windows 11 + Docker）

PowerShellでリポジトリ直下に移動した状態で、以下を実行します。

```powershell
docker run --rm -it `
  -v "${PWD}:/app" `
  -w /app `
  node:24-alpine sh -lc "apk add --no-cache zip >/dev/null && npm install && npm run build:zip"
```

実行ログに `Created: /app/release/taskManage-build.zip` が出れば成功です。

> `set: line 2: illegal option -` が出る場合は、`scripts/create-build-zip.sh` の改行コードがCRLFになっている可能性があります。以下でLFへ変換して再実行してください。

```powershell
docker run --rm -it `
  -v "${PWD}:/app" `
  -w /app `
  node:24-alpine sh -lc "apk add --no-cache zip >/dev/null && tr -d '\015' < scripts/create-build-zip.sh > scripts/create-build-zip.sh.lf && mv scripts/create-build-zip.sh.lf scripts/create-build-zip.sh && chmod +x scripts/create-build-zip.sh && npm install && npm run build:zip"
```

`release/taskManage-build.zip` が生成されます。

## 配布ZIPの実行（Windows 11 ローカル）

1. `release/taskManage-build.zip` を任意フォルダに解凍
2. PowerShellで解凍先に移動
3. 以下を実行

```powershell
./run-local.cmd
```

4. 既定ブラウザが自動で開きます（開かない場合は `http://localhost:4173` を手動で開く）

## 現在の状態

- `src/` に機能別の空ファイルひな型を配置済み
- 各ファイルに interface/type と TODO コメントを付与
- 次ステップは CSV 取込 → カンバン → ガントの順で実装予定
