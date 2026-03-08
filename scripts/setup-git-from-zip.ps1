param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git command not found. Please install Git first."
}

if (-not (Test-Path ".git")) {
  Write-Host "[1/4] Initializing git repository..."
  Invoke-Git -Args @("init")
} else {
  Write-Host "[1/4] Existing .git directory found."
}

$hasOrigin = $false
& git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) {
  $hasOrigin = $true
}

if ($hasOrigin) {
  Write-Host "[2/4] Updating origin URL..."
  Invoke-Git -Args @("remote", "set-url", "origin", $RepoUrl)
} else {
  Write-Host "[2/4] Adding origin URL..."
  Invoke-Git -Args @("remote", "add", "origin", $RepoUrl)
}

Write-Host "[3/4] Fetching remote history..."
Invoke-Git -Args @("fetch", "origin")

$remoteBranchExists = $false
& git rev-parse --verify "origin/$Branch" *> $null
if ($LASTEXITCODE -eq 0) {
  $remoteBranchExists = $true
}

if (-not $remoteBranchExists) {
  throw "Remote branch 'origin/$Branch' was not found. Check -Branch and -RepoUrl values."
}

$localBranchExists = $false
& git rev-parse --verify $Branch *> $null
if ($LASTEXITCODE -eq 0) {
  $localBranchExists = $true
}

if ($localBranchExists) {
  Write-Host "[4/4] Setting local branch '$Branch' to track origin/$Branch..."
  Invoke-Git -Args @("checkout", $Branch)
  Invoke-Git -Args @("branch", "--set-upstream-to=origin/$Branch", $Branch)
} else {
  Write-Host "[4/4] Checking out branch '$Branch' from origin/$Branch..."
  Invoke-Git -Args @("checkout", "-b", $Branch, "--track", "origin/$Branch")
}

Write-Host ""
Write-Host "Setup complete. You can now update this project with:"
Write-Host "  git pull"
