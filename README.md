# ClassSync Pro - 宿題管理システム

小学校向けの宿題管理・提出システムです。先生が宿題を管理し、児童がICカード・NFCカードで宿題を提出できます。

---

## 🌐 Webアプリ版（現在公開中）

- **URL**: https://homework-nfc-new.vercel.app
- **対応デバイス**: Android（NFC内蔵）、iOS（手動入力）、PC（手動入力）
- **機能**: 学年・クラス選択、宿題管理、児童名簿管理、提出状況確認

---

## 💻 Electronアプリ版（Windows PC + USBカードリーダー対応）

### 特徴

- ✅ **Windows PC対応**
- ✅ **USB接続のICカードリーダーに対応**
- ✅ **オフライン動作**
- ✅ **インストール型アプリ**

### 必要なもの

1. **Windows PC**（Windows 10/11推奨）
2. **Node.js**（v18以上）
3. **USB接続のICカードリーダー**（例: SCR3310など）
4. **ICカードリーダーのドライバー**

---

## 🚀 セットアップ手順（Windows PC）

### 1️⃣ リポジトリをクローン

```bash
git clone https://github.com/junkwarrior11/homework-NFC-new.git
cd homework-NFC-new
```

### 2️⃣ 依存関係をインストール

```bash
npm install
```

**⚠️ 重要**: `nfc-pcsc`のインストールには以下が必要です：

- **PC/SC-Lite**（Windows標準で利用可能）
- **ドライバー**（カードリーダーメーカーから提供）

多くのWindows PCでは、USBカードリーダーを接続すると自動的にドライバーがインストールされます。

### 3️⃣ 開発モードで起動

```bash
npm run electron:dev
```

- Vite開発サーバーとElectronが起動します
- ブラウザの開発者ツールが自動で開きます
- ICカードリーダーが接続されていれば、自動認識されます

### 4️⃣ ビルド（配布用のインストーラー作成）

```bash
npm run electron:build:win
```

- `dist-electron`フォルダに `.exe` インストーラーが生成されます
- 他のPCに配布可能

---

## 📱 ICカードリーダーの設定

### 推奨カードリーダー

- **Sony PaSoRi RC-S380**（FeliCa対応）
- **SCR3310**（ISO14443準拠）
- **ACR122U**（NFC対応）

### ドライバーのインストール

1. カードリーダーをUSBに接続
2. Windowsが自動的にドライバーをインストール
3. デバイスマネージャーで「スマートカードリーダー」に表示されることを確認

### 動作確認

1. `npm run electron:dev` でアプリを起動
2. 児童側画面で「📡 スキャン」をクリック
3. ICカードをカードリーダーにかざす
4. カードIDが自動的に検出される

---

## 📂 プロジェクト構造

```
homework-NFC-new/
├── electron/              # Electronメインプロセス
│   ├── main.cjs          # メインプロセス（ICカードリーダー制御）
│   ├── preload.cjs       # プリロードスクリプト
│   └── electron.d.ts     # Electron API型定義
├── src/                   # Reactアプリ
│   ├── App.tsx           # メインアプリ
│   ├── components/       # コンポーネント
│   ├── views/            # 画面（Dashboard, Homework, StudentMaster, Export）
│   ├── store.ts          # データストレージ
│   └── types.ts          # 型定義
├── public/               # 静的ファイル
├── dist/                 # ビルド済みWebアプリ
├── dist-electron/        # Electronビルド出力
├── package.json          # 依存関係とスクリプト
├── vite.config.ts        # Vite設定
└── README.md             # このファイル
```

---

## 📝 使い方

### 先生側の操作

1. アプリ起動
2. **「担任の先生」**を選択
3. 学年（1年〜6年）を選択
4. クラス（い組 or ろ組）を選択
5. パスワードを入力（初期: `teacher2026`）
6. 管理画面で以下が可能：
   - 📝 宿題の作成・編集・削除
   - 👦 児童名簿の管理
   - 📊 提出状況の確認
   - 💾 データのエクスポート

### 児童側の操作

1. アプリ起動
2. **「児童のみなさん」**を選択
3. **📡 スキャン**ボタンをクリック
4. ICカードをかざす（またはIDを手動入力）
5. 提出する宿題を選択
6. **✅ 提出する**ボタンをクリック

---

## 🔧 トラブルシューティング

### ICカードリーダーが認識されない

1. デバイスマネージャーで「スマートカードリーダー」を確認
2. ドライバーが正しくインストールされているか確認
3. カードリーダーを別のUSBポートに接続
4. 再起動

### ビルドエラー

```bash
npm cache clean --force
npm install
npm run electron:build:win
```

### NFC読み取りエラー

- カードをカードリーダーの中心にしっかりかざす
- カードとリーダーの間に金属製のものがないか確認

---

## 🔐 データの保存

- **ローカルストレージ**: ブラウザのlocalStorageに保存
- **Electronアプリ**: `%APPDATA%\ClassSync Pro\Local Storage`に保存
- **エクスポート機能**: JSON形式でバックアップ可能

---

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

---

## 🙋 お問い合わせ

問題があれば、GitHubのIssuesで報告してください：  
https://github.com/junkwarrior11/homework-NFC-new/issues
