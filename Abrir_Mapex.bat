@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "Mapex\index.html" cd /d "%~dp0Mapex"

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) { Start-Process python -ArgumentList '-m http.server 3000' -WindowStyle Hidden }; Start-Sleep -Milliseconds 600; Start-Process 'http://localhost:3000'"
exit
