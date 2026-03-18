/**
 * copy-standalone.js
 *
 * next build --output standalone 只輸出 server.js + node_modules，
 * 但 .next/static 和 public/ 需要手動複製到 standalone 資料夾內，
 * 否則生產伺服器找不到靜態資源。
 *
 * 執行時機：next build 完成後，electron-builder 執行前。
 * 呼叫方式：node scripts/copy-standalone.js
 */

const fs   = require("node:fs");
const path = require("node:path");

const ROOT       = path.join(__dirname, "..");
const STANDALONE = path.join(ROOT, ".next", "standalone");
const STATIC_SRC = path.join(ROOT, ".next", "static");
const STATIC_DST = path.join(STANDALONE, ".next", "static");
const PUBLIC_SRC = path.join(ROOT, "public");
const PUBLIC_DST = path.join(STANDALONE, "public");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-standalone] 來源不存在，跳過：${src}`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

console.log("[copy-standalone] 開始複製靜態資源…");

if (!fs.existsSync(STANDALONE)) {
  console.error("[copy-standalone] ✕ .next/standalone 不存在！請先執行 next build");
  process.exit(1);
}

copyDir(STATIC_SRC, STATIC_DST);
console.log(`[copy-standalone] ✓ .next/static → ${STATIC_DST}`);

copyDir(PUBLIC_SRC, PUBLIC_DST);
console.log(`[copy-standalone] ✓ public → ${PUBLIC_DST}`);

console.log("[copy-standalone] 完成！可繼續執行 electron-builder。");
