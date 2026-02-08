#!/bin/bash

echo "===================================="
echo "  ClassSync Pro を起動しています..."
echo "===================================="
echo ""

cd "$(dirname "$0")"

echo "サーバーを起動中..."
npm run dev &
SERVER_PID=$!

echo "5秒待機中..."
sleep 5

echo "ブラウザを起動中..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:3000
fi

echo ""
echo "===================================="
echo "  ClassSync Pro が起動しました！"
echo "  ブラウザでアプリが開きます"
echo "===================================="
echo ""
echo "アプリを終了する場合は Ctrl+C を押してください"
echo ""

wait $SERVER_PID
