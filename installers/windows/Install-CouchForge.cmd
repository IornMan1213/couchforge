@echo off
setlocal EnableExtensions
title CouchForge Installer v0.2.0
cd /d "%~dp0"

echo ========================================
echo   CouchForge Windows Installer v0.2.0
echo ========================================
echo.

where powershell >nul 2>&1
if errorlevel 1 (
  echo PowerShell is required.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-CouchForge.ps1"
set ERR=%ERRORLEVEL%
if not %ERR%==0 (
  echo.
  echo Install failed with code %ERR%.
  pause
  exit /b %ERR%
)
echo.
pause
