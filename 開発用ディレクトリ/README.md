# taskManage（開発用ディレクトリ）

このディレクトリには、taskManage の開発に必要なソースコードと設定ファイルが含まれています。

## 主要ディレクトリ

- `src/` : アプリ本体
- `docs/` : 要件・設計ドキュメント
- `scripts/` : 補助スクリプト
- `data/` : サンプルデータ

## セットアップ

```bash
npm install
```

## 開発サーバ起動

```bash
npm run dev -- --host 0.0.0.0
```

ブラウザで `http://localhost:5173` を開いて確認します。

## 主要スクリプト

- `npm run dev` : 開発サーバ起動
- `npm run build` : TypeScript + Vite ビルド
- `npm run typecheck` : 型チェック
- `npm run lint` : ESLint
- `npm run build:zip` : 配布用 ZIP 作成

## 配布用 ZIP の作成

```bash
npm run build:zip
```

作成された ZIP は、リポジトリ直下の `配布版ビルド済みディレクトリ/` に出力されます。

## ドキュメント

- 要件定義: `docs/offline-task-manager-requirements-v1.0.md`
- ドメイン設計: `docs/architecture/domain-design.md`
