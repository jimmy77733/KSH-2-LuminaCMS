專案名稱：LuminaCMS > 定位：極美感、組件化、完全掌控的「個人離線無頭內容管理系統」。
核心目標：取代 WordPress 並整合現代化 React 組件庫，實現「零成本」的高效能靜態網站開發工作流。

一、 技術規格概覽 (Technical Specs)
類別
技術棧 (Tech Stack)
全端框架
Next.js (App Router)
開發語言
TypeScript (TS)
樣式處理
Tailwind CSS + Framer Motion
UI 組件庫
Magic UI, React Bits
編輯器基底
Craft.js (用於實現 Elementor 風格的拖拉畫布)
資料庫
SQLite (透過 better-sqlite3 直接操作)
圖片處理
Sharp (Node.js) + Pillow (Python 腳本備援)
部署整合
GitHub REST API
桌面打包
Electron + electron-builder


二、 核心功能開發藍圖
1. 視覺化編輯器 (WYSIWYG Engine)
自由畫布：在 1200px(根據裝置的大小動態調整) 的固定容器內，實現元件的自由排序與位置調整。
預覽模式：編輯時外層包裹實時渲染的 Header 與 Sidebar，達成「所見即所得」。
動態工具列 (Phase 3 完成)：頂部可展開工具列，收納模板選擇與常用樣式庫，向下擠壓畫布。
組件短代碼：支援自定義組件（如 MorphingText），在渲染時自動對應到 React 組件。
2. 媒體與圖片管理系統
索引機制：透過 SQLite ID 引用圖片。更改圖片名稱時，系統自動更新所有關聯文章的路徑。
響應式圖片：上傳時自動利用 Sharp 生成 WebP 格式的多種尺寸（Large, Small, Thumb）。
自動輸出：HTML 生成時自動寫入 <picture> 標籤，支援不同裝置的解析度自適應。
3. CSS 凍結與換膚機制
視覺穩定性：每篇文章在發布時會進行「樣式快照 (Style Snapshot)」，將當下的 CSS 編譯並與 HTML 捆綁。
模板系統：支援多個模板編號（Template_01, Template_02），新文章可自由挑選模板，舊文章除非手動重新編譯，否則不受全站樣式更新影響。
組件樣式字典 (Phase 4/5 完成)：COMPONENT_STYLE_REGISTRY 架構，Magic UI 組件靜態 CSS/SVG 自動注入。
4. RBAC 權限管理
權限分級：
Admin: 系統配置、模板設計、全權管理。
Editor: 文章撰寫、圖片管理。
Viewer: 僅限查看 Dashboard 數據。

三、 資料庫結構 (better-sqlite3 Schema 參考)
程式碼片段
// 核心邏輯截錄
model Post {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  contentJson   String   // 儲存編輯器的 JSON 結構
  htmlSnapshot  String   // 轉譯後的 HTML
  cssSnapshot   String   // 凍結的 CSS
  createdAt     DateTime @default(now())
  templateId    String
  template      Template @relation(fields: [templateId], references: [id])
}

model Media {
  id           String   @id @default(cuid())
  originalName String
  altText      String?
  pathJson     String   // 儲存不同尺寸的 WebP 路徑
}


四、 開發階段與里程碑

✅ Phase 1 [已完成]：初始化 Next.js 環境與 better-sqlite3 配置，建立 RBAC 登入功能。
  - Next.js App Router + TypeScript 架構
  - better-sqlite3 資料庫整合（放棄 Prisma ORM，改用直接操作）
  - RBAC 登入頁面與 Session 管理

✅ Phase 2 [已完成]：開發媒體庫 API，實現圖片自動裁切、轉碼與名稱連動更新邏輯。
  - /api/media 上傳端點（Sharp 自動裁切為 large/small/thumb）
  - WebP 格式自動轉換
  - Media 資料庫索引管理

✅ Phase 3 [已完成]：整合 Craft.js 建立拖拉編輯器，並將 Magic UI 組件包裝成可選物件。
  - Craft.js 畫布整合（TextComponent, ImageComponent, Container, MorphingTextComponent）
  - 頂部動態工具列（模板選擇 + 常用樣式庫，向下擠壓畫布）
  - 側邊欄簡化（元件工具箱 + 快捷鍵）
  - MorphingText 液態變形文字元件（SVG feColorMatrix 閾值濾鏡）

✅ Phase 4 [已完成]：撰寫靜態編譯器（Compiler），將資料庫內容輸出為實體 HTML/CSS。
  - craftJsonToHtml 靜態 HTML 編譯器
  - COMPONENT_STYLE_REGISTRY 組件樣式字典（可擴充架構）
  - MorphingText 零 JS 純 CSS 輸出（SVG filter + @keyframes 多 span stagger）
  - 模板系統（CSS 快照凍結機制）
  - DownloadHtmlButton 一鍵下載 HTML
  - PackAssetsButton 圖片資源清單掃描

✅ Phase 5 [已完成]：整合 GitHub API，實作「一鍵發布」與進度監控視窗。
  - /api/publish 後端端點（GitHub REST API 推送 HTML + 圖片）
  - 409 衝突自動重試（先取 SHA → 帶 SHA 更新，TOCTOU 防護）
  - 圖片路徑自動修正（/uploads/ → /{repo}/uploads/，符合 GitHub Pages 結構）
  - iOS 風格進度條 Modal（假進度動畫 + 真實 API 並行）
  - GitHub Pages 首次設定提示
  - .env.example 環境變數範本

🚧 Phase 6 [規劃中]：跨平台客戶端發布 (Desktop App Distribution)
  目標：產出可直接雙擊執行的桌面應用程式，無需安裝 Node.js 或手動啟動伺服器。
  架構：Electron（主程序）+ Next.js Standalone（嵌入式伺服器）+ electron-builder（打包）
  輸出：
    - Windows: LuminaCMS-Setup-x.x.x.exe（NSIS 安裝程式，x64）
    - macOS:   LuminaCMS-x.x.x.dmg（Intel + Apple Silicon 通用）
    - Linux:   LuminaCMS-x.x.x.AppImage（可攜執行檔）
  關鍵技術挑戰：
    - better-sqlite3 原生模組在 Electron 環境中的 asar unpack 配置
    - Sharp 原生模組跨平台重建（electron-rebuild）
    - SQLite 資料庫路徑在打包後的持久化儲存位置（app.getPath('userData')）
    - macOS 公證（Notarization）與 Windows 代碼簽章
  打包指令：
    npm run electron:build:win   → 產出 Windows 安裝程式
    npm run electron:build:mac   → 產出 macOS DMG
    npm run electron:dev         → 開發模式（連接 next dev）

五、 GitHub Pages 部署邊界提醒
完全支援：JS 動態特效、CSS 動畫、組件交互、圖片響應式切換。
不支援：後端 API 運算（如即時搜尋資料庫）、動態留言存取、會員登入（線上版）。
解決方案：所有動態行為均在「本地 LuminaCMS」處理完成後，以「靜態結果」推送到雲端。
路徑說明：GitHub Pages 根路徑為 /{repoName}/，圖片路徑已自動修正（rewriteImagePathsForGitHubPages）。
