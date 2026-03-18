/**
 * electron-builder 打包設定
 *
 * 打包前置步驟（npm run electron:build 自動執行）：
 *   1. next build（產生 .next/standalone/）
 *   2. scripts/copy-standalone.js（補齊 static 與 public）
 *
 * 產出目錄：../dist/
 *   - Windows: LuminaCMS-Setup-x.x.x.exe  (NSIS 安裝程式)
 *   - macOS:   LuminaCMS-x.x.x.dmg        (DMG 磁碟映像)
 *   - Linux:   LuminaCMS-x.x.x.AppImage   (可攜執行檔)
 */

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.luminacms.desktop",
  productName: "LuminaCMS",
  copyright: "Copyright © 2025 LuminaCMS",

  // Electron 主程序入口
  main: "electron/main.js",

  // 打包後的輸出目錄（專案根目錄的 dist/）
  directories: {
    output: "../dist",
    buildResources: "electron/resources",
  },

  // 打包進應用程式的來源檔案
  files: [
    "electron/**/*.js",
    // Next.js standalone 輸出（由 copy-standalone.js 整理）
    { from: ".next/standalone", to: "." },
    { from: ".next/static",     to: ".next/static" },
    { from: "public",           to: "public" },
    // 排除不必要的大型檔案
    "!**/*.map",
    "!**/*.ts",
    "!**/*.tsx",
    "!**/node_modules/.cache/**",
  ],

  // 額外複製到 resources/ 的資源（避免 asar 壓縮問題）
  extraResources: [
    {
      from: ".next/standalone",
      to: "nextjs",
      filter: ["**/*", "!**/*.map"],
    },
    {
      // 靜態資源注入到 standalone 旁邊
      from: ".next/static",
      to: "nextjs/.next/static",
    },
    {
      from: "public",
      to: "nextjs/public",
    },
  ],

  // ── Windows 設定 ───────────────────────────────────────────────────────────
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    // icon: "electron/resources/icon.ico",  // 請替換成你的圖示
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "LuminaCMS",
    installerLanguages: ["zh-TW", "en"],
    language: "1028", // 繁體中文
  },

  // ── macOS 設定 ─────────────────────────────────────────────────────────────
  mac: {
    target: [
      { target: "dmg",  arch: ["x64", "arm64"] },
      { target: "zip",  arch: ["arm64"] },
    ],
    category: "public.app-category.productivity",
    // icon: "electron/resources/icon.icns",  // 請替換成你的圖示
    hardenedRuntime: false,
    gatekeeperAssess: false,
  },

  dmg: {
    title: "LuminaCMS ${version}",
    contents: [
      { x: 130, y: 220, type: "file" },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
    window: { width: 540, height: 380 },
  },

  // ── Linux 設定 ─────────────────────────────────────────────────────────────
  linux: {
    target: ["AppImage", "deb"],
    category: "Office",
    // icon: "electron/resources/icon.png",
  },

  // ── 原生模組重建（better-sqlite3）──────────────────────────────────────────
  // electron-builder 會自動執行 electron-rebuild
  npmRebuild: true,

  // Node.js 原生模組需打包為 asar 外部檔案（避免載入失敗）
  asar: true,
  asarUnpack: [
    "**/node_modules/better-sqlite3/**",
    "**/node_modules/sharp/**",
    "**/*.node",
  ],
};
