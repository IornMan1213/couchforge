@echo off
cd /d "%~dp0..\.."
if not exist "host\index.js" (
  echo Run Install-CouchForge.cmd first, or place this next to the app root.
  pause
  exit /b 1
)
title CouchForge
node host\index.js
pause
