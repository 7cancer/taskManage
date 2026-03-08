#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <GitHub repository URL> [branch]"
  echo "Example: $0 https://github.com/<owner>/<repo>.git main"
  exit 1
fi

REPO_URL="$1"
BRANCH="${2:-main}"

if [[ ! -d .git ]]; then
  echo "[1/4] Initializing git repository..."
  git init
else
  echo "[1/4] Existing .git directory found."
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "[2/4] Updating origin URL..."
  git remote set-url origin "$REPO_URL"
else
  echo "[2/4] Adding origin URL..."
  git remote add origin "$REPO_URL"
fi

echo "[3/4] Fetching remote history..."
git fetch origin

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "[4/4] Setting local branch '$BRANCH' to track origin/$BRANCH..."
  git branch --set-upstream-to="origin/$BRANCH" "$BRANCH"
else
  echo "[4/4] Checking out branch '$BRANCH' from origin/$BRANCH..."
  git checkout -b "$BRANCH" --track "origin/$BRANCH"
fi

echo

echo "Setup complete. You can now update this project with:"
echo "  git pull"
