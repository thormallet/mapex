@echo off
title Mapex 3D - Worldbuilding GIS
cd /d "%~dp0"

powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) { Start-Process python -ArgumentList '-m http.server 3000' -WindowStyle Hidden; Start-Sleep -Milliseconds 800 }"

start http://localhost:3000
exit
