@echo off
chcp 65001 >nul 2>&1
title AI 英语精读阅读器
echo ========================================
echo   AI 英语精读阅读器 - 正在启动服务器...
echo   浏览器将自动打开 http://127.0.0.1:18789
echo ========================================
echo.
cd /d "%~dp0"
start "" http://127.0.0.1:18789
node server.js
pause
