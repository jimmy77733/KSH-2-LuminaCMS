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
SQLite (透過 Prisma ORM 管理)
圖片處理
Sharp (Node.js) + Pillow (Python 腳本備援)
部署整合
GitHub REST API + Simple-Git


二、 核心功能開發藍圖
1. 視覺化編輯器 (WYSIWYG Engine)
自由畫布：在 1200px(根據裝置的大小動態調整) 的固定容器內，實現元件的自由排序與位置調整。
預覽模式：編輯時外層包裹實時渲染的 Header 與 Sidebar，達成「所見即所得」。
樣式快取 (Presets)：系統自動偵測重複的 Inline CSS，提示使用者儲存為全站通用的樣式預設值。
組件短代碼：支援自定義組件（如 [button] 或 [accordion]），在渲染時自動對應到 React 組件。
2. 媒體與圖片管理系統
索引機制：透過 SQLite ID 引用圖片。更改圖片名稱時，系統自動更新所有關聯文章的路徑。
響應式圖片：上傳時自動利用 Sharp 生成 WebP 格式的多種尺寸（Large, Small, Thumb）。
自動輸出：HTML 生成時自動寫入 <picture> 標籤，支援不同裝置的解析度自適應。
3. CSS 凍結與換膚機制
視覺穩定性：每篇文章在發布時會進行「樣式快照 (Style Snapshot)」，將當下的 CSS 編譯並與 HTML 捆綁。
模板系統：支援多個模板編號（Template_01, Template_02），新文章可自由挑選模板，舊文章除非手動重新編譯，否則不受全站樣式更新影響。
4. RBAC 權限管理
權限分級：
Admin: 系統配置、模板設計、全權管理。
Editor: 文章撰寫、圖片管理。
Viewer: 僅限查看 Dashboard 數據。

三、 資料庫結構 (Prisma Schema 參考)
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
Phase 1: 初始化 Next.js 環境與 Prisma SQLite 配置，建立 RBAC 登入功能。
Phase 2: 開發媒體庫 API，實現圖片自動裁切、轉碼與名稱連動更新邏輯。
Phase 3: 整合 Craft.js 建立拖拉編輯器，並將 Magic UI 組件包裝成可選物件。
Phase 4: 撰寫靜態編譯器（Compiler），將資料庫內容輸出為實體 HTML/CSS。
Phase 5: 整合 GitHub API，實作「一鍵發布」與 Actions 狀態監控視窗。

五、 GitHub Pages 部署邊界提醒
完全支援：JS 動態特效、CSS 動畫、組件交互、圖片響應式切換。
不支援：後端 API 運算（如即時搜尋資料庫）、動態留言存取、會員登入（線上版）。
解決方案：所有動態行為均在「本地 LuminaCMS」處理完成後，以「靜態結果」推送到雲端。
