/**
 * LuminaCMS Electron 主程序
 *
 * 運作流程：
 *   1. app.whenReady() 觸發
 *   2. 生產模式：spawn Node.js 執行 .next/standalone/server.js
 *   3. 輪詢 http://localhost:PORT 直到伺服器就緒（最多 60 秒）
 *   4. 建立 BrowserWindow，載入 /dashboard
 *
 * 開發模式（isDev）：
 *   直接連到已運行的 next dev（port 3000），不啟動額外伺服器。
 *   執行：npm run electron:dev
 *
 * 生產打包（electron-builder）：
 *   執行：npm run electron:build
 */

const { app, BrowserWindow, shell, Menu } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");

// ─── 常數 ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3100;
const isDev = !app.isPackaged;

let nextServer = null;
let mainWindow = null;
let splashWindow = null;

// ─── 路徑計算 ──────────────────────────────────────────────────────────────────
/**
 * 生產模式下，electron-builder 將 Next.js standalone 輸出複製到：
 *   {resourcesPath}/nextjs/
 */
function getStandaloneServerPath() {
  return path.join(process.resourcesPath, "nextjs", "server.js");
}

function getPublicDir() {
  return path.join(process.resourcesPath, "nextjs", "public");
}

// ─── 伺服器啟動 ────────────────────────────────────────────────────────────────
function startNextServer() {
  if (isDev) return Promise.resolve(); // 開發模式：next dev 已在外部運行

  const serverScript = getStandaloneServerPath();

  if (!fs.existsSync(serverScript)) {
    console.error("[Electron] server.js 不存在：", serverScript);
    return Promise.reject(new Error("Next.js standalone server.js not found"));
  }

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
    };

    console.log("[Electron] 啟動 Next.js 伺服器…", serverScript);

    nextServer = spawn(process.execPath, [serverScript], {
      env,
      cwd: path.dirname(serverScript),
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout.on("data", (data) => {
      const line = data.toString().trim();
      console.log("[Next.js]", line);
      // Next.js 就緒標誌
      if (line.includes("Ready") || line.includes("started server")) {
        resolve();
      }
    });

    nextServer.stderr.on("data", (data) => {
      console.error("[Next.js stderr]", data.toString().trim());
    });

    nextServer.on("error", reject);
    nextServer.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error("[Electron] Next.js 意外退出，code:", code);
      }
    });

    // 備援：60 秒後若沒收到就緒訊號，改用輪詢確認
    setTimeout(() => resolve(), 60_000);
  });
}

/** 輪詢等待 HTTP 伺服器就緒 */
function waitForServer(port, maxMs = 90_000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + maxMs;
    const check = () => {
      const req = http.get(
        { hostname: "127.0.0.1", port, path: "/", timeout: 2000 },
        () => resolve(true),
      );
      req.on("error", () => {
        if (Date.now() < deadline) setTimeout(check, 500);
        else resolve(false);
      });
      req.on("timeout", () => { req.destroy(); });
    };
    check();
  });
}

// ─── Splash Screen ──────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 220,
    frame: false,
    resizable: false,
    center: true,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const splashHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    height:220px; background:#fff; border-radius:20px;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;
    box-shadow:0 24px 60px rgba(0,0,0,0.18);
  }
  .logo { font-size:36px; margin-bottom:12px; }
  .name { font-size:22px; font-weight:700; color:#111; letter-spacing:-0.5px; }
  .sub  { font-size:13px; color:#999; margin-top:4px; }
  .bar  {
    margin-top:20px; width:160px; height:3px;
    background:#eee; border-radius:99px; overflow:hidden;
  }
  .fill {
    height:100%; width:30%; background:#111; border-radius:99px;
    animation: slide 1.2s ease-in-out infinite;
  }
  @keyframes slide {
    0%   { transform:translateX(-100%); }
    100% { transform:translateX(600%); }
  }
</style>
</head>
<body>
  <div class="logo">✦</div>
  <div class="name">LuminaCMS</div>
  <div class="sub">正在啟動伺服器…</div>
  <div class="bar"><div class="fill"></div></div>
</body>
</html>`;

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`,
  );
}

// ─── 主視窗 ────────────────────────────────────────────────────────────────────
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "LuminaCMS",
    // macOS：隱藏標題列但保留交通燈按鈕
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
    backgroundColor: "#F5F5F7",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 攔截外部連結，在瀏覽器中開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}`) &&
        !url.startsWith(`http://localhost:${PORT}`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.on("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
  });

  return mainWindow;
}

// ─── 應用程式選單（macOS）──────────────────────────────────────────────────────
function buildMenu() {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about", label: `關於 ${app.name}` },
        { type: "separator" },
        { role: "hide", label: "隱藏" },
        { role: "hideOthers", label: "隱藏其他" },
        { role: "unhide", label: "全部顯示" },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    },
    {
      label: "編輯",
      submenu: [
        { role: "undo", label: "撤銷" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪下" },
        { role: "copy", label: "複製" },
        { role: "paste", label: "貼上" },
        { role: "selectAll", label: "全選" },
      ],
    },
    {
      label: "視窗",
      submenu: [
        { role: "minimize", label: "縮小" },
        { role: "zoom", label: "縮放" },
        { type: "separator" },
        { role: "front", label: "全部移到最前面" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── 生命週期 ──────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  buildMenu();

  if (!isDev) createSplash();

  try {
    // 啟動 Next.js 伺服器
    await startNextServer();

    // 等待 HTTP 就緒
    const baseUrl = isDev
      ? `http://localhost:3000`
      : `http://127.0.0.1:${PORT}`;

    if (!isDev) {
      const ready = await waitForServer(PORT);
      if (!ready) throw new Error("伺服器啟動超時");
    }

    // 建立並載入主視窗
    const win = await createMainWindow();
    await win.loadURL(`${baseUrl}/dashboard`);
  } catch (err) {
    console.error("[Electron] 啟動失敗：", err);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();

    // 顯示錯誤視窗
    const errWin = new BrowserWindow({ width: 500, height: 300, center: true });
    errWin.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        `<body style="font-family:system-ui;padding:32px;background:#fff">
          <h2 style="color:#c00">LuminaCMS 啟動失敗</h2>
          <pre style="font-size:12px;color:#555;white-space:pre-wrap">${String(err)}</pre>
        </body>`,
      )}`,
    );
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const baseUrl = isDev ? "http://localhost:3000" : `http://127.0.0.1:${PORT}`;
      const win = await createMainWindow();
      await win.loadURL(`${baseUrl}/dashboard`);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    killServer();
    app.quit();
  }
});

app.on("before-quit", killServer);

function killServer() {
  if (nextServer && !nextServer.killed) {
    console.log("[Electron] 關閉 Next.js 伺服器…");
    nextServer.kill("SIGTERM");
    nextServer = null;
  }
}
