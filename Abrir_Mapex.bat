@echo off
title Mapex 3D
cd /d "%~dp0"
if exist "%~dp0Mapex\index.html" cd /d "%~dp0Mapex"

start "Mapex 3D Server" /min node server.js
ping -n 2 127.0.0.1 >nul
start http://localhost:3000
exit
