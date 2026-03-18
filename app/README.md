# LuminaCMS（app）

LuminaCMS 是一套「本地離線」的內容管理系統：你在本機用拖拉式編輯器完成文章、圖片與版型，系統會產生 **靜態 HTML/CSS**，並可一鍵發布到 **GitHub Pages**。

本 README 是給**第一次使用**的人：照著做就能跑起來，不需要先理解整個架構。

---

## 你需要先安裝什麼

- **Node.js**：建議安裝 **Node.js 20（LTS）**或更新版本
- **Git**：若你是從 GitHub clone 專案

> 本專案包含 `better-sqlite3`、`sharp` 這類原生模組；大多數情況 `npm install` 會自動安裝對應的預編譯版本。若你的環境較特殊，請看文末「常見問題」。

---

## 第一次啟動（最常用）

在專案的 `app/` 目錄執行：

```bash
npm install
npm run dev
```

然後用瀏覽器打開 `http://localhost:3000`，進入後台：

- **Dashboard**：`http://localhost:3000/dashboard`
- **登入頁**：`http://localhost:3000/login`

預設管理員帳號（開發用）：

- 帳號：`admin`
- 密碼：`admin123`

---

## 清除緩存
npm cache clean --force

## 重置 TypeScript 的語言伺服器
啟指令面板：Ctrl + Shift + P (Mac 為 Cmd + Shift + P)
TypeScript: Restart TS server

## 完全重置 Next.js 暫存
rmdir /s /q .next && npm run dev

## 常用功能入口（你可以直接照著點）

- **新建文章**：Dashboard →「新建文章」
- **文章管理**：Dashboard →「文章管理」
  - 查看：`/dashboard/posts/preview/[id]`
  - 編輯：`/dashboard/posts/edit/[id]`
  - 下載 HTML：文章列表的 `↓ HTML`
  - 掃描圖片資源：文章列表的 `📦 資源`
  - 發布到 GitHub：文章列表的 `🚀 發布`
- **媒體庫**：Dashboard →「媒體庫」
  - 上傳後會自動產生 `large/small/thumb` 三種 WebP

---

## 設定 GitHub 一鍵發布（可選）

若你要使用「🚀 發布到 GitHub Pages」，請在 `app/` 目錄新增一個檔案：`.env`，內容如下（自行填入）：

```bash
GITHUB_TOKEN=你的PAT
GITHUB_OWNER=你的GitHub帳號或org
GITHUB_REPO=你的repo名稱
# GITHUB_BRANCH=main
```

發布流程會把檔案推到你的 repo：

- HTML：`posts/{slug}.html`
- 圖片：`uploads/{year}/{month}/*.webp`

第一次使用 GitHub Pages 時，請到 GitHub 的 `Settings → Pages` 設定來源分支（通常是 `main`），等待 1–2 分鐘後網址才會生效。

---

## Electron 桌面版（可選）

### 開發模式（本機跑桌面視窗）

需要**開兩個終端機**：

終端機 A（啟動 Next.js dev server）：

```bash
npm run dev
```

終端機 B（啟動 Electron，會連到 localhost:3000）：

```bash
npm run electron:dev
```

### 打包（產出安裝檔/可執行檔）

```bash
npm run electron:build:win
# 或 npm run electron:build:mac
# 或 npm run electron:build:linux
```

產物會輸出到專案根目錄的 `dist/`。

---

## 資料放在哪裡（你會用到的）

- **資料庫**：`app/dev.db`（SQLite）
- **上傳圖片檔案**：`app/public/uploads/**`

---

## 常見問題（遇到錯誤時先看這裡）

### 1) 登入失敗或忘記密碼

你可以在 `app/` 目錄執行下列指令，強制建立/覆寫 `admin/admin123`：

```bash
node scripts/force-db-setup.js
```

### 2) `npm install` 安裝原生模組失敗（better-sqlite3 / sharp）

請先確認：

- Node.js 版本為 20（LTS）或更新
- 重新執行 `npm install`

若仍失敗（Windows 常見），通常需要安裝對應的建置工具鏈後再重試 `npm install`。
