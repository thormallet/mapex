@echo off
title Mapex Studio 2.5D
cd /d "%~dp0"

:: Inicia o servidor Node em background se instalado e abre no navegador
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start /b "" node server.js >nul 2>&1
    start http://localhost:3000
) else (
    start "" "%~dp0index.html"
)
exit
