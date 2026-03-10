# taskManage

オフラインタスク管理Webアプリの実装リポジトリ。

## 開発環境セットアップ（TypeScript + Vite）

```bash
npm install
npm run dev
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

## 配布用ZIP作成

PowerShellで作業フォルダまで移動済みであれば、以下だけで作成できます。

```powershell
npm install
npm run build:zip
```

```bash
npm run build:zip
```


Dockerを使う場合は、**既存コンテナがなくても動く** `docker run` での実行が簡単です（`bash` 不要）。

```powershell
docker run --rm -it `
  -v "${PWD}:/app" `
  -w /app `
  node:24-alpine sh -lc "npm install && npm run build:zip"
```

すでに起動中コンテナに入れている場合のみ、コンテナ内で以下を実行してください。

```bash
npm install
npm run build:zip
```

`docker exec` を使う場合は、先に `docker ps` で確認した**実在するコンテナ名**を指定してください。

```bash
docker exec -it <container_name> sh -lc "cd /app && npm install && npm run build:zip"
```

`release/taskManage-build.zip` が生成されます。ZIPを解凍後、同梱の `run-local.sh` または `run-local.ps1` を実行すると、`http://localhost:4173` でアプリを利用できます。
