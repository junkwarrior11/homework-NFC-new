# Electronアプリのセットアップ手順（Windows PC）

このガイドでは、Windows PCでClassSync Pro Electronアプリをビルドして使用する手順を説明します。

---

## 🎯 前提条件

### 必要なもの

1. **Windows PC**（Windows 10/11推奨）
2. **Node.js** v18以上（https://nodejs.org/ja/ からダウンロード）
3. **Git**（https://git-scm.com/ からダウンロード）
4. **USB接続のICカードリーダー**（推奨: Sony PaSoRi RC-S380、SCR3310、ACR122Uなど）

---

## 📋 セットアップ手順

### 1️⃣ リポジトリをクローン

```powershell
git clone https://github.com/junkwarrior11/homework-NFC-new.git
cd homework-NFC-new
```

### 2️⃣ 依存関係をインストール

```powershell
npm install
```

**⚠️ 重要**:

- `nfc-pcsc`パッケージのインストールには**PC/SC-Lite**が必要です
- Windowsでは標準でサポートされているため、通常は追加インストール不要です
- カードリーダーのドライバーは製造元のサイトからダウンロードしてインストールしてください

### 3️⃣ ICカードリーダーのドライバーをインストール

#### Sony PaSoRi RC-S380の場合

1. [Sonyの公式サイト](https://www.sony.co.jp/Products/felica/consumer/products/RC-S380.html)からドライバーをダウンロード
2. ダウンロードしたインストーラーを実行
3. カードリーダーをUSBポートに接続
4. Windowsがデバイスを認識するまで待つ

#### 他のカードリーダーの場合

1. 製造元のWebサイトからドライバーをダウンロード
2. インストール手順に従ってインストール
3. USBポートに接続して認識を確認

### 4️⃣ デバイスマネージャーで確認

1. **Win + X**を押して「デバイスマネージャー」を開く
2. **「スマートカードリーダー」**のカテゴリを確認
3. カードリーダーが表示されていれば成功

---

## 🚀 アプリの起動

### 開発モード（デバッグ用）

```powershell
npm run electron:dev
```

- Vite開発サーバーとElectronアプリが同時に起動します
- 開発者ツールが自動的に開きます
- コードを変更すると自動的にリロードされます

### インストーラーをビルド（配布用）

```powershell
npm run electron:build:win
```

- ビルドが完了すると `dist-electron` フォルダに `.exe` インストーラーが生成されます
- このインストーラーを他のPCに配布できます

---

## ✅ 動作確認

### 1. アプリを起動

```powershell
npm run electron:dev
```

### 2. 児童側画面でテスト

1. **「児童のみなさん」**をクリック
2. **「📡 スキャン」**ボタンをクリック
3. ICカードをカードリーダーにかざす
4. カードIDが自動的に検出され、ログイン画面に表示される

### 3. コンソールログを確認

開発者ツールのコンソールに以下のようなログが表示されれば成功です：

```
📡 NFC Reader detected: ACS ACR122U PICC Interface
💳 Card detected: 04:A1:B2:C3:D4:E5:F6
```

---

## 🔧 トラブルシューティング

### ❌ カードリーダーが認識されない

**原因**: ドライバーがインストールされていない、またはカードリーダーが接続されていない

**解決策**:
1. デバイスマネージャーで「スマートカードリーダー」を確認
2. カードリーダーを別のUSBポートに接続
3. PCを再起動
4. ドライバーを再インストール

### ❌ `npm install` でエラーが出る

**原因**: `nfc-pcsc`のビルドに必要なツールが不足している

**解決策**:
1. **Visual Studio Build Tools**をインストール:
   ```powershell
   npm install --global windows-build-tools
   ```

2. 再度 `npm install` を実行

### ❌ カードを読み取れない

**原因**: カードの位置が適切でない、またはカードの種類が対応していない

**解決策**:
1. カードをカードリーダーの中心にしっかりかざす
2. カードとリーダーの間に金属製のものがないか確認
3. 対応カード種別を確認（ISO14443準拠、FeliCa、MIFAREなど）

### ❌ Electronアプリが起動しない

**原因**: ポート競合、または依存関係の不足

**解決策**:
1. ポート5173が他のプロセスで使用されていないか確認:
   ```powershell
   netstat -ano | findstr :5173
   ```

2. 依存関係を再インストール:
   ```powershell
   npm cache clean --force
   npm install
   ```

---

## 📦 配布用インストーラー

### ビルド

```powershell
npm run electron:build:win
```

### 生成されるファイル

- `dist-electron/ClassSync Pro Setup 1.0.0.exe` - インストーラー
- `dist-electron/win-unpacked/` - 非圧縮版（インストール不要）

### 配布方法

1. `ClassSync Pro Setup 1.0.0.exe` を配布
2. 受け取った人はダブルクリックしてインストール
3. インストール後、スタートメニューから **ClassSync Pro** を起動

---

## 🎓 使い方

### 先生側

1. アプリ起動
2. **「担任の先生」**を選択
3. 学年とクラスを選択
4. パスワードを入力（初期: `teacher2026`）
5. 管理画面で宿題管理・児童名簿管理・提出状況確認が可能

### 児童側

1. アプリ起動
2. **「児童のみなさん」**を選択
3. **「📡 スキャン」**をクリック
4. ICカードをかざす
5. 提出する宿題を選択
6. **「✅ 提出する」**をクリック

---

## 📞 サポート

問題が解決しない場合は、以下から問い合わせてください：

- **GitHub Issues**: https://github.com/junkwarrior11/homework-NFC-new/issues
- **リポジトリ**: https://github.com/junkwarrior11/homework-NFC-new

---

## 🔐 データの保存場所

- **Windows**: `%APPDATA%\ClassSync Pro\Local Storage`
- **バックアップ**: エクスポート機能でJSON形式でバックアップ可能
