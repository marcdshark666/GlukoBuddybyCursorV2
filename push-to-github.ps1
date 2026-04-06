$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

Write-Host "== GlukoBuddy GitHub push start ==" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
  git init
}

git add .

try {
  git commit -m "Initial commit: GlukoBuddy pixel garden + Dexcom Share setup"
} catch {
  Write-Host "No new commit created (possibly nothing to commit)." -ForegroundColor Yellow
}

git branch -M main

$remoteUrl = "https://github.com/marcdshark666/GlukoBuddybyCursorV2.git"
$remoteExists = $false
try {
  $currentRemote = git remote get-url origin 2>$null
  if ($LASTEXITCODE -eq 0 -and $currentRemote) {
    $remoteExists = $true
  }
} catch {}

if ($remoteExists) {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

git push -u origin main

Write-Host ""
Write-Host "== Done. Verifying ==" -ForegroundColor Green
git branch -a
git remote -v
Write-Host ""
Write-Host "Now go to GitHub Settings > Pages, choose main /(root), then Save." -ForegroundColor Cyan
