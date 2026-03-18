專案名稱：**LuminaCMS**
定位：極美感、組件化、完全掌控的「個人離線無頭內容管理系統」
核心目標：取代 WordPress 並整合現代化 React 組件庫，建立「本地編輯 → 靜態輸出 → 一鍵發布」的高效工作流。

---

## 一、技術規格概覽（Technical Specs）

- **全端框架**：Next.js（App Router）
- **語言**：TypeScript
- **樣式**：Tailwind CSS（CSS 實作為主，編輯器/Modal 等）
- **視覺化編輯器**：Craft.js（Elementor 風格拖拉畫布）
- **資料庫**：SQLite（透過 `better-sqlite3` 直接操作）
- **圖片處理**：Sharp（上傳時生成多尺寸 WebP）
- **一鍵發布**：GitHub REST API（將 HTML + 圖片推送到 GitHub Pages 專用 repo）
- **桌面打包**：Electron + electron-builder（Next.js standalone 內嵌伺服器）

---

## 二、專案資料夾／檔案功能樹狀圖（整體 Repo）

> 目標：讓第一次接手的人能「看樹狀圖就知道每個資料夾做什麼」，並能直接對照到工作流會用到哪些檔案。

```
KSH-2-LuminaCMS/
├─ Project_Plan.md
├─ posts/
│  └─ *.html
└─ app/                       # LuminaCMS 主程式（Next.js + API + Electron）
   ├─ package.json
   ├─ package-lock.json
   ├─ next.config.ts
   ├─ tsconfig.json
   ├─ eslint.config.mjs
   ├─ postcss.config.mjs
   ├─ electron-builder.config.js
   ├─ dev.db                  # SQLite 開發資料庫（含 Post/Media/User/Role/Template）
   ├─ electron/
   │  └─ main.js               # Electron 主程序：dev 連 3000；prod 內嵌 standalone server
   ├─ prisma/
   │  ├─ schema.prisma         # 資料表模型（歷史/對照用；實際 runtime 以 better-sqlite3 操作）
   │  ├─ migrations/           # 建表 SQL（用於初始化資料庫結構）
   │  └─ seed.*                # Prisma seed（可選；專案也提供 non-prisma 的 force setup）
   ├─ scripts/
   │  ├─ copy-standalone.js    # Electron 打包前補齊 .next/static + public 到 standalone
   │  └─ force-db-setup.js     # 強制建立/覆寫 admin 帳號（需資料表已存在）
   ├─ public/
   │  └─ uploads/              # 圖片上傳後輸出：/uploads/{year}/{month}/*.webp（large/small/thumb）
   └─ src/
      ├─ app/                  # Next.js App Router：頁面與 API routes
      │  ├─ layout.tsx         # 全站 layout（全域樣式/結構入口）
      │  ├─ page.tsx           # 首頁（通常導向/入口頁）
      │  ├─ login/             # 登入頁（建立 session cookie）
      │  ├─ dashboard/         # 後台：文章/媒體/編輯器
      │  └─ api/               # 後端 API：auth/media/posts/templates/publish
      ├─ components/
      │  ├─ editor/            # Craft.js 可拖拉元件（Text/Image/Container/MorphingText…）
      │  ├─ posts/             # 文章操作按鈕（下載 HTML / 打包資源 / 發布 / 刪除）
      │  └─ ui/                # 通用 UI（ConfirmModal、MorphingText…）
      └─ lib/                  # 核心服務：auth/db/compiler/template/sanitize
         ├─ auth.ts
         ├─ db.ts
         ├─ craftToHtml.ts
         ├─ sanitizeHtml.ts
         └─ templates/
            └─ default.ts
```

---

## 三、各資料夾／模組功能詳解（不重複版）

### 1) 根目錄（repo-level）

- **`Project_Plan.md`**：本文件，包含架構、樹狀圖、工作流與檔案對照。
- **`posts/`**：靜態輸出產物（例如發佈後的 `slug.html`）。
  - 實際上在程式內「輸出/發布」主要是把 HTML 推送到 GitHub repo 的 `posts/{slug}.html`，本地 `posts/` 可作為匯出/測試產物的落地位置（目前 repo 內已有範例檔）。

### 2) `app/`（主程式）

- **`app/package.json`**：所有指令入口（`dev`、`electron:dev`、`electron:build:*`）。
- **`app/next.config.ts`**：開啟 Next.js `output: "standalone"`，支援 Electron 生產模式內嵌 server。
- **`app/dev.db`**：SQLite 開發 DB（程式執行時由 `better-sqlite3` 直接讀寫）。
- **`app/public/uploads/`**：媒體庫上傳後生成的 WebP 檔案與路徑根（API 與前端都假設路徑以 `/uploads/...` 開頭）。
- **`app/electron/main.js`**：桌面端主程序。
  - **開發模式**：直接連到已運行的 `next dev`（3000）。
  - **生產模式**：啟動 `resources/nextjs/server.js`（standalone）後再載入 `/dashboard`。
- **`app/scripts/copy-standalone.js`**：補齊 `next build` 只輸出 server 的缺口，將 `.next/static` 與 `public/` 複製進 standalone。
- **`app/scripts/force-db-setup.js`**：建立或覆寫 `admin/admin123`（使用 `better-sqlite3` 直接寫 DB）。
- **`app/prisma/**`**：資料表結構的「初始化與對照」來源。
  - runtime 的查詢/寫入以 `app/src/lib/db.ts`（better-sqlite3）為準；但 migrations 的 SQL 很適合拿來做「首次建立空 DB」。

---

## 四、工作流（從第一次開啟到發布）與「每一步會用到的檔案」

> 這段是給維護者/開發者看的「行為 → 檔案」索引；照這個順序讀檔最快理解整個系統。

### A. 啟動與入口

- **使用者動作**：啟動開發伺服器、打開後台
- **涉及檔案**
  - `app/package.json`：`npm run dev`
  - `app/src/app/layout.tsx`、`app/src/app/page.tsx`：站點入口
  - `app/src/app/dashboard/page.tsx`：Dashboard 入口（會檢查 session，未登入導向 login）

### B. 登入（RBAC Session）

- **使用者動作**：在 `/login` 輸入帳號密碼
- **流程與檔案**
  - UI：`app/src/app/login/page.tsx`（`fetch("/api/auth/login")` → 成功後 `router.push("/dashboard")`）
  - API：`app/src/app/api/auth/login/route.ts`
    - 查 DB：`User` 與 `Role`
    - 密碼驗證：`bcrypt.compare`
    - 設定 cookie：`app/src/lib/auth.ts`（`setSessionCookie`）
  - DB 連線：`app/src/lib/db.ts`（`better-sqlite3` 開啟 `dev.db`）
  - 若需重置 admin：`app/scripts/force-db-setup.js`

### C. 文章列表（管理/操作入口）

- **使用者動作**：進入 `/dashboard/posts` 看文章清單、點「查看/編輯/下載/資源/發布/刪除」
- **流程與檔案**
  - UI：`app/src/app/dashboard/posts/page.tsx`
    - 直接用 `db.prepare(...).all()` 讀 `Post` 列表
  - 刪除（Server Action）：`app/src/app/dashboard/posts/actions.ts`（`deletePostAction`）
  - 按鈕元件：
    - 下載 HTML：`app/src/components/posts/DownloadHtmlButton.tsx`（呼叫 `/api/posts/:id` 取 `htmlSnapshot`）
    - 掃描資源：`app/src/components/posts/PackAssetsButton.tsx`（掃描 `htmlSnapshot` 中 `/uploads/...`）
    - 一鍵發布：`app/src/components/posts/PublishButton.tsx` → `PublishProgressModal.tsx`（呼叫 `/api/publish`）
    - 刪除確認：`app/src/components/posts/DeleteButton.tsx`（搭配 `ConfirmModal`）

### D. 新建文章（Craft.js 編輯 → 產生 HTML Snapshot）

- **使用者動作**：`/dashboard/posts/new` 拖拉元件、編輯文字、選模板、預覽、存檔/發布
- **流程與檔案**
  - 編輯器頁：`app/src/app/dashboard/posts/new/page.tsx`
    - Craft 元件：`app/src/components/editor/UserComponents.tsx`
    - 模板列表：`fetch("/api/templates")` → `app/src/app/api/templates/route.ts`
    - 將 Craft JSON 轉內容 HTML：`app/src/lib/craftToHtml.ts`（`craftJsonToHtml`）
    - 套模板外殼：`app/src/lib/templates/default.ts`（`getTemplateShell`）
    - 寫入 DB：`POST /api/posts` → `app/src/app/api/posts/route.ts`
  - 視窗預覽（暫存）：
    - 儲存在 localStorage：key `lumina_temp_preview`
    - 預覽頁：`app/src/app/dashboard/posts/preview/temp/page.tsx`

### E. 編輯既有文章（讀取 → 修改 → PUT 更新）

- **使用者動作**：`/dashboard/posts/edit/[id]` 修改後「存為草稿/更新文章」
- **流程與檔案**
  - 編輯器頁：`app/src/app/dashboard/posts/edit/[id]/page.tsx`
    - 讀取文章：`GET /api/posts/:id` → `app/src/app/api/posts/[id]/route.ts`
    - 更新文章：`PUT /api/posts/:id` → `app/src/app/api/posts/[id]/route.ts`
    - 仍會走：`craftJsonToHtml` + `getTemplateShell` 生成 `htmlSnapshot`

### F. 文章預覽（從 DB 的 htmlSnapshot 直接渲染）

- **使用者動作**：`/dashboard/posts/preview/[id]` 查看目前快照
- **流程與檔案**
  - 預覽頁：`app/src/app/dashboard/posts/preview/[id]/page.tsx`
    - 讀 DB：`Post.htmlSnapshot`
    - `dangerouslySetInnerHTML` 直接渲染完整 HTML（模板外殼 + 內容）

### G. 媒體庫（上傳 → 生成多尺寸 → DB 索引 → 編輯器選圖）

- **使用者動作**：`/dashboard/media` 上傳圖片、瀏覽、刪除、複製 URL
- **流程與檔案**
  - UI：`app/src/app/dashboard/media/page.tsx`
    - 讀取列表：`GET /api/media` → `app/src/app/api/media/route.ts`
    - 上傳圖片：`POST /api/media/upload` → `app/src/app/api/media/upload/route.ts`
    - 刪除圖片：`DELETE /api/media?id=...` → `app/src/app/api/media/route.ts`
  - 圖片處理：`app/src/app/api/media/upload/route.ts` 使用 `sharp`
    - 寫檔：`app/public/uploads/{year}/{month}/*-{large|small|thumb}-{timestamp}.webp`
    - DB 建索引：`Media.pathJson`（存三種路徑）
  - 編輯器選圖：`app/src/components/editor/UserComponents.tsx` 的 `ImageComponent`
    - 點「選擇圖片」→ `fetch("/api/media")` → 套用 `large/small/thumb`

### H. 一鍵發布到 GitHub Pages（圖片同步 + HTML 推送 + 路徑修正）

- **使用者動作**：在文章列表點「🚀 發布」
- **流程與檔案**
  - UI：`app/src/components/posts/PublishProgressModal.tsx`（呼叫 `/api/publish` 並顯示進度/結果）
  - API：`app/src/app/api/publish/route.ts`
    - 從 DB 讀文章：`Post.htmlSnapshot`、`slug`
    - 掃描圖片：regex 抓 `src|srcset="/uploads/..."`
    - 讀本地圖片：從 `app/public` 讀 `/uploads/...`
    - 上傳到 GitHub：PUT `uploads/...`
    - 上傳 HTML：PUT `posts/{slug}.html`
    - 路徑修正：`app/src/lib/craftToHtml.ts` 的 `rewriteImagePathsForGitHubPages`
  - 必要環境變數（在 `app/.env`）
    - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`（選填）

### I. 桌面端（Electron）開發與打包

- **使用者動作**：用 Electron 跑起來，或打包成安裝檔
- **流程與檔案**
  - 開發模式：
    - `npm run dev`（Next 3000）
    - `npm run electron:dev` → `app/electron/main.js`（直接載入 `http://localhost:3000/dashboard`）
  - 生產打包：
    - `npm run electron:build[:win|:mac|:linux]`
    - `app/next.config.ts`（standalone）
    - `app/scripts/copy-standalone.js`（補齊 static/public）
    - `app/electron-builder.config.js`（asar unpack 原生模組：`better-sqlite3`、`sharp`）
    - `app/electron/main.js`（在 packaged 模式 spawn standalone server）

---

## 五、資料與產物在哪裡（維運常用對照）

- **文章資料**：`app/dev.db` 的 `Post` 表（`contentJson`, `htmlSnapshot`, `cssSnapshot`）
- **媒體資料**：`app/dev.db` 的 `Media` 表 + 實體檔 `app/public/uploads/**`（WebP）
- **本地預覽暫存**：瀏覽器 localStorage `lumina_temp_preview`
- **發布到 GitHub 的路徑**
  - HTML：`posts/{slug}.html`
  - 圖片：`uploads/{year}/{month}/*.webp`
  - Pages URL：`https://{OWNER}.github.io/{REPO}/posts/{slug}.html`

---

## 六、部署邊界提醒（GitHub Pages）

- **完全支援**：CSS 動畫、前端互動、圖片響應式切換（都在靜態 HTML/CSS 內完成）
- **不支援**：任何需要伺服器的動態 API（例如線上 DB 搜尋、登入、即時寫入）
- **設計原則**：所有動態行為都在「本地 LuminaCMS」完成，雲端只放「靜態結果」
