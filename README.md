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


Docker上で動かしている場合は、コンテナ内で以下を実行してください。

```bash
npm install
npm run build:zip
```

ホスト側から実行する場合（コンテナ名が `taskmanage` の例）は以下です。

```bash
docker exec -it taskmanage bash -lc "cd /workspace/taskManage && npm install && npm run build:zip"
```

`release/taskManage-build.zip` が生成されます。ZIPを解凍後、同梱の `run-local.sh` または `run-local.ps1` を実行すると、`http://localhost:4173` でアプリを利用できます。
