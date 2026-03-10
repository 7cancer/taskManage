#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
RELEASE_DIR="$ROOT_DIR/release"
STAGING_DIR="$RELEASE_DIR/taskManage-build"
ZIP_PATH="$RELEASE_DIR/taskManage-build.zip"

cd "$ROOT_DIR"

npm run build

if ! command -v zip >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    echo "zip command not found. Installing zip via apk..."
    apk add --no-cache zip >/dev/null
  fi
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip command not found. Install zip and retry." >&2
  exit 1
fi

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
cp -R "$DIST_DIR"/. "$STAGING_DIR"/

cat > "$STAGING_DIR/README.txt" <<'README'
TaskManage ビルド版（Windows 11 ローカル実行想定）

■ 使い方
1. このZIPを任意の場所に解凍
2. PowerShellで解凍先フォルダへ移動
3. `./run-local.cmd` を実行
4. 既定ブラウザが自動で開きます（開かない場合は http://localhost:4173 を手動で開く）
README

cat > "$STAGING_DIR/run-local.cmd" <<'CMD'
@echo off
cd /d "%~dp0"
start "" "http://localhost:4173"
python -m http.server 4173
CMD

rm -f "$ZIP_PATH"
(cd "$RELEASE_DIR" && zip -r "$(basename "$ZIP_PATH")" "$(basename "$STAGING_DIR")" > /dev/null)

echo "Created: $ZIP_PATH"
