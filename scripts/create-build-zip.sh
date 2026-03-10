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
4. ブラウザで http://localhost:4173 を開く

■ トラブルシュート
- `localhost で接続が拒否されました` と表示される場合:
  - サーバー起動直後の可能性があります。数秒待って再読み込みしてください。
- `Python was not found; run without arguments to install from the Microsoft Store ...` と表示される場合:
  - Windows の App execution aliases が反応している可能性があります。
  - `py -V` が使えるか確認し、使えない場合は Python 3 をインストールしてください。
README

cat > "$STAGING_DIR/run-local.cmd" <<'CMD'
@echo off
setlocal
cd /d "%~dp0"
set "PORT=4173"

set "PYTHON_CMD="

where py >nul 2>&1
if %errorlevel%==0 (
  py -3 -c "import sys" >nul 2>&1
  if %errorlevel%==0 (
    set "PYTHON_CMD=py -3"
  )
)

if not defined PYTHON_CMD (
  where python >nul 2>&1
  if %errorlevel%==0 (
    python -c "import sys" >nul 2>&1
    if %errorlevel%==0 (
      set "PYTHON_CMD=python"
    )
  )
)

if not defined PYTHON_CMD (
  echo [ERROR] A usable Python 3 runtime was not found.
  echo.
  echo If you see "Python was not found; run without arguments to install from the Microsoft Store...",
  echo disable the Python alias in:
  echo   Settings ^> Apps ^> Advanced app settings ^> App execution aliases
  echo then install Python 3 from https://www.python.org/downloads/windows/
  echo.
  pause
  exit /b 1
)

echo Starting local server at http://localhost:%PORT% ...
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:%PORT%'"
%PYTHON_CMD% -m http.server %PORT%
CMD

rm -f "$ZIP_PATH"
(cd "$RELEASE_DIR" && zip -r "$(basename "$ZIP_PATH")" "$(basename "$STAGING_DIR")" > /dev/null)

echo "Created: $ZIP_PATH"
