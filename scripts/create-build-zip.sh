#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
RELEASE_DIR="$ROOT_DIR/release"
STAGING_DIR="$RELEASE_DIR/taskManage-build"
ZIP_PATH="$RELEASE_DIR/taskManage-build.zip"

cd "$ROOT_DIR"

npm run build

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
cp -R "$DIST_DIR"/. "$STAGING_DIR"/

cat > "$STAGING_DIR/README.txt" <<'README'
TaskManage ビルド版

■ 使い方
1. このフォルダを任意の場所に展開
2. 以下のいずれかでローカルサーバーを起動

[macOS / Linux]
./run-local.sh

[Windows PowerShell]
./run-local.ps1

3. ブラウザで以下を開く
http://localhost:4173
README

cat > "$STAGING_DIR/run-local.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
python3 -m http.server 4173
SH
chmod +x "$STAGING_DIR/run-local.sh"

cat > "$STAGING_DIR/run-local.ps1" <<'PS1'
Set-Location -Path $PSScriptRoot
python -m http.server 4173
PS1

rm -f "$ZIP_PATH"
(cd "$RELEASE_DIR" && zip -r "$(basename "$ZIP_PATH")" "$(basename "$STAGING_DIR")" > /dev/null)

echo "Created: $ZIP_PATH"
