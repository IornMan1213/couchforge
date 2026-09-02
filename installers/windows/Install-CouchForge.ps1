#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Version = '0.2.0'
$Repo = 'IornMan1213/couchforge'
$InstallRoot = Join-Path $env:LOCALAPPDATA "CouchForge"
$AppDir = Join-Path $InstallRoot "app"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  CouchForge Installer v$Version" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command 'node')) {
  Write-Host "Node.js not found. Trying winget..." -ForegroundColor Yellow
  if (Test-Command 'winget') {
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
  } else {
    Write-Host "Install Node.js 18+ from https://nodejs.org then re-run this installer." -ForegroundColor Red
    exit 1
  }
}

$nodeVer = (node -v) 2>$null
Write-Host "Node: $nodeVer"

$zipUrl = "https://github.com/$Repo/archive/refs/tags/v$Version.zip"
$fallbackUrl = "https://github.com/$Repo/archive/refs/heads/main.zip"
$zipPath = Join-Path $env:TEMP "couchforge-$Version.zip"

Write-Host "Downloading CouchForge..." -ForegroundColor Cyan
try {
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
} catch {
  Write-Host "Tag v$Version zip not found yet; using main branch." -ForegroundColor Yellow
  Invoke-WebRequest -Uri $fallbackUrl -OutFile $zipPath -UseBasicParsing
}

if (Test-Path $AppDir) {
  Write-Host "Removing previous install at $AppDir"
  Remove-Item -Recurse -Force $AppDir
}
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

$extract = Join-Path $env:TEMP "couchforge-extract-$Version"
if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
Expand-Archive -Path $zipPath -DestinationPath $extract -Force

$inner = Get-ChildItem $extract | Select-Object -First 1
Copy-Item -Path $inner.FullName -Destination $AppDir -Recurse -Force

Set-Location $AppDir
Write-Host "Installing npm packages (includes FFmpeg helper)..." -ForegroundColor Cyan
npm install
Write-Host "Installing robotjs (mouse/keyboard)..." -ForegroundColor Cyan
npm install robotjs --no-save 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "robotjs optional install failed (you can retry later). Video still works." -ForegroundColor Yellow
}

$startCmd = @"
@echo off
cd /d "$AppDir"
title CouchForge
echo Starting CouchForge...
echo Open http://localhost:3090 on this PC after it starts.
echo.
node host\index.js
pause
"@
$launcher = Join-Path $InstallRoot "Start-CouchForge.cmd"
Set-Content -Path $launcher -Value $startCmd -Encoding ASCII

$desktop = [Environment]::GetFolderPath('Desktop')
$deskLauncher = Join-Path $desktop "Start CouchForge.cmd"
Copy-Item $launcher $deskLauncher -Force

Write-Host ""
Write-Host "Installed to: $AppDir" -ForegroundColor Green
Write-Host "Launcher:    $deskLauncher" -ForegroundColor Green
Write-Host ""
Write-Host "Double-click 'Start CouchForge' on your Desktop, then open:" -ForegroundColor Cyan
Write-Host "  http://localhost:3090" -ForegroundColor White
Write-Host "Default room code: COUCH1" -ForegroundColor White
Write-Host ""
