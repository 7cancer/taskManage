param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git command not found. Please install Git first."
}

if (-not (Test-Path ".git")) {
  Write-Host "[1/4] Initializing git repository..."
  git init | Out-Null
} else {
  Write-Host "[1/4] Existing .git directory found."
}

$hasOrigin = $false
try {
  git remote get-url origin | Out-Null
  $hasOrigin = $true
} catch {
  $hasOrigin = $false
}

if ($hasOrigin) {
  Write-Host "[2/4] Updating origin URL..."
  git remote set-url origin $RepoUrl
} else {
  Write-Host "[2/4] Adding origin URL..."
  git remote add origin $RepoUrl
}

Write-Host "[3/4] Fetching remote history..."
git fetch origin

$localBranchExists = $true
try {
  git rev-parse --verify $Branch | Out-Null
} catch {
  $localBranchExists = $false
}

if ($localBranchExists) {
  Write-Host "[4/4] Setting local branch '$Branch' to track origin/$Branch..."
  git branch --set-upstream-to="origin/$Branch" $Branch
  git checkout $Branch
} else {
  Write-Host "[4/4] Checking out branch '$Branch' from origin/$Branch..."
  git checkout -b $Branch --track "origin/$Branch"
}

Write-Host ""
Write-Host "Setup complete. You can now update this project with:"
Write-Host "  git pull"
