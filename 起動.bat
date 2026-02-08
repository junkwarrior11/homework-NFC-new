@echo off
echo ====================================
echo   ClassSync Pro を起動しています...
echo ====================================
echo.

cd /d "%~dp0"

echo サーバーを起動中...
start /B npm run dev

echo ブラウザを起動中...
timeout /t 5 /nobreak > nul
start http://localhost:3000

echo.
echo ====================================
echo   ClassSync Pro が起動しました！
echo   ブラウザでアプリが開きます
echo ====================================
echo.
echo このウィンドウは閉じないでください
echo アプリを終了する場合は Ctrl+C を押してください
echo.
pause
