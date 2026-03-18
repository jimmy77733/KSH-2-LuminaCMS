/**
 * POST /api/publish
 *
 * Phase 5：GitHub 一鍵發布
 *
 * 接收 { postId }，執行以下流程：
 *   1. 從 SQLite 讀取文章（htmlSnapshot + slug）
 *   2. 掃描 htmlSnapshot 中的 /uploads/ 圖片路徑
 *   3. 將所有關聯圖片推送到 GitHub 倉庫 uploads/{...}
 *   4. 將 HTML 推送到 GitHub 倉庫 posts/{slug}.html
 *   5. 回傳結果（GitHub Pages URL、各檔案狀態）
 *
 * 409 衝突處理策略：
 *   - getFileSha：區分 404（檔案不存在）與真實錯誤（401/403/5xx）
 *   - putGitHubFile：遇到 409 自動抓取最新 SHA 重試一次（TOCTOU 防護）
 *   - 所有 GitHub API 錯誤回傳完整 response body，方便除錯
 *
 * 所需環境變數（設定於 .env）：
 *   GITHUB_TOKEN  — GitHub Personal Access Token（需有 repo write 權限）
 *   GITHUB_OWNER  — 倉庫擁有者（使用者名稱或 org）
 *   GITHUB_REPO   — 倉庫名稱
 *   GITHUB_BRANCH — 目標分支（選填，預設 main）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewriteImagePathsForGitHubPages } from "@/lib/craftToHtml";
import fs from "node:fs/promises";
import path from "node:path";

// ─── Pages 首頁（index.html）產生 ───────────────────────────────────────────────
type PublishedPostRow = {
  slug: string;
  title: string;
  createdAt: string;
  publishedAt: string | null;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(raw: string | null): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function buildIndexHtml(posts: PublishedPostRow[]): string {
  const items =
    posts.length === 0
      ? `<div class="scroll-stack-card stack-empty">
  <div class="stack-empty-inner">
    <div class="stack-empty-title">尚無已發布文章</div>
    <div class="stack-empty-sub">
      你可以到 Dashboard 建立文章並使用 🚀 發布，首頁會自動顯示。
    </div>
  </div>
</div>`
      : posts
          .map((p) => {
            const href = `posts/${encodeURIComponent(p.slug)}.html`;
            const date = formatDate(p.createdAt);
            return `<a class="scroll-stack-card stack-post-card" href="${href}">
  <div class="stack-post-top">
    <div class="stack-post-left">
      <div class="stack-post-title">${escapeHtml(p.title || p.slug)}</div>
      <div class="stack-post-date">${escapeHtml(date)}</div>
      <div class="stack-post-slug">/${escapeHtml(p.slug)}</div>
    </div>
    <div class="stack-post-pill">🌐 Published</div>
  </div>
</a>`;
          })
          .join("\n");

  const css = `
    :root{
      --bg:#F5F5F7;
      --fg:#111111;
      --muted:#6e6e73;
      --accent:#0071e3;
      --ring:rgba(0,0,0,0.06);

      --card-bg:rgba(255, 255, 255, 0.62);
      --card-border:rgba(0, 0, 0, 0.08);
      --card-shadow:0 20px 70px rgba(0, 0, 0, 0.10);

      --card-bg-dark:rgba(20, 20, 22, 0.56);
      --card-border-dark:rgba(255, 255, 255, 0.10);
      --card-shadow-dark:0 20px 70px rgba(0, 0, 0, 0.45);

      --slug-pill-bg:rgba(0,0,0,0.05);
      --slug-pill-fg:#6b7280;
      --slug-pill-bg-dark:rgba(255,255,255,0.10);
      --slug-pill-fg-dark:#f5f5f7;
    }

    html.dark{
      --bg:#0a0a0a;
      --fg:#f5f5f7;
      --muted:#98989d;
      --accent:#0a84ff;
      --ring:rgba(255,255,255,0.10);

      --card-bg:var(--card-bg-dark);
      --card-border:var(--card-border-dark);
      --card-shadow:var(--card-shadow-dark);

      --slug-pill-bg:var(--slug-pill-bg-dark);
      --slug-pill-fg:var(--slug-pill-fg-dark);
    }

    *{box-sizing:border-box}
    html,body{min-height:100%}

    body{
      margin:0;
      padding:0;
      background:var(--bg);
      color:var(--fg);
      font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Helvetica Neue",Helvetica,Arial,sans-serif;
      -webkit-font-smoothing:antialiased;
    }

    .nav{
      position:sticky;top:0;z-index:50;
      border-bottom:1px solid rgba(0,0,0,0.06);
      background:rgba(255,255,255,0.60);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
    }
    html.dark .nav{
      border-bottom:1px solid rgba(255,255,255,0.10);
      background:rgba(0,0,0,0.40);
    }
    .nav-inner{
      max-width:1080px;
      margin:0 auto;
      padding:12px 16px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
    }
    .brand{display:flex;align-items:center;gap:10px}
    .brand-dot{
      display:grid;place-items:center;
      height:36px;width:36px;border-radius:12px;
      background:#000;color:#fff;
      font-size:14px;font-weight:700;
    }
    html.dark .brand-dot{background:#fff;color:#000}
    .brand-title{font-size:14px;font-weight:600;letter-spacing:-0.01em}

    #lcms-theme-toggle{
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.10);
      background:rgba(255,255,255,0.72);
      padding:8px 14px;
      color:var(--fg);
      font-size:12px;
      font-weight:600;
      cursor:pointer;
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
      transition:background .12s ease, transform .05s ease;
    }
    #lcms-theme-toggle:hover{background:rgba(255,255,255,0.90)}
    #lcms-theme-toggle:active{transform:scale(0.98)}
    html.dark #lcms-theme-toggle{
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(255,255,255,0.10);
    }
    html.dark #lcms-theme-toggle:hover{background:rgba(255,255,255,0.16)}

    .hero{
      max-width:1080px;margin:0 auto;
      padding:20px 16px 6px;
    }
    .hero-card{
      border-radius:16px;
      border:1px solid rgba(0,0,0,0.06);
      background:rgba(255,255,255,0.60);
      padding:14px 14px;
      box-shadow:0 10px 30px rgba(0,0,0,0.05);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
    }
    html.dark .hero-card{
      border:1px solid rgba(255,255,255,0.10);
      background:rgba(255,255,255,0.05);
    }
    .hero-kicker{
      font-size:22px;
      font-weight:600;
      text-transform:uppercase;
      letter-spacing:0.18em;
      color:var(--muted);
      opacity:0.9;
    }
    .hero-title{margin:8px 0 0;font-size:40px;font-weight:700;letter-spacing:-0.02em}
    .hero-sub{margin:10px 0 0;font-size:26px;color:var(--muted);line-height:1.6}

    /* ── ScrollStack（對應 app/src/app/globals.css 的 class） ──────────────── */
    .scroll-stack-scroller{
      position:relative;
      height:100vh;
      overflow:auto;
      overscroll-behavior:contain;
      scrollbar-width:none;
    }
    .scroll-stack-scroller::-webkit-scrollbar{width:0;height:0}
    .scroll-stack-inner{
      position:relative;
      padding:120px 16px 200px;
      max-width:980px;
      margin:0 auto;
    }
    .scroll-stack-card{
      position:relative;
      border-radius:28px;
      transform:translateZ(0);
      background:var(--card-bg);
      border:1px solid var(--card-border);
      box-shadow:var(--card-shadow);
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
    }
    .scroll-stack-end{height:60vh}

    /* 卡片內容（確保文字在淺/深色都清楚） */
    .stack-post-card{
      display:block;
      text-decoration:none;
      color:var(--fg);
      padding:28px 28px 26px;
      outline:none;
    }
    .stack-post-top{
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
    }
    .stack-post-left{min-width:0}
    .stack-post-title{
      font-size:36px;
      font-weight:700;
      letter-spacing:-0.01em;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .stack-post-date{
      margin-top:6px;
      font-size:24px;
      color:var(--muted);
    }
    .stack-post-slug{
      margin-top:10px;
      display:inline-block;
      padding:6px 10px;
      border-radius:10px;
      background:var(--slug-pill-bg);
      color:var(--slug-pill-fg);
      font-size:24px;
      font-weight:600;
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
    }
    .stack-post-pill{
      flex:0 0 auto;
      border-radius:999px;
      padding:6px 12px;
      font-size:24px;
      font-weight:700;
      color:#059669;
      background:rgba(16,185,129,0.12);
      border:1px solid rgba(16,185,129,0.20);
    }
    html.dark .stack-post-pill{
      color:#6ee7b7;
      background:rgba(16,185,129,0.10);
      border:1px solid rgba(110,231,183,0.25);
    }

    .stack-empty{
      display:block;
      padding:26px 26px;
    }
    .stack-empty-inner{max-width:560px}
    .stack-empty-title{
      font-size:32px;font-weight:700;
    }
    .stack-empty-sub{
      margin-top:6px;
      font-size:26px;color:var(--muted);line-height:1.6;
    }

    .mt-4{margin-top:16px}
  `.trim();

  // 注意：此處不能使用 React/Lenis import，只能輸出純 JS，確保 GitHub Pages 的 index.html 也能動起來
  const scrollInitScript = `
(function(){
  var STORAGE_KEY = 'lcms_theme';

  function getSystemPref(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(next){
    document.documentElement.classList.toggle('dark', next === 'dark');
    var btn = document.getElementById('lcms-theme-toggle');
    if(btn){
      btn.textContent = next === 'dark' ? '☾ 深色' : '☀ 淺色';
    }
  }

  function initTheme(){
    var saved = localStorage.getItem(STORAGE_KEY);
    if(saved !== 'light' && saved !== 'dark') saved = null;
    var next = saved || getSystemPref();
    applyTheme(next);

    var btn = document.getElementById('lcms-theme-toggle');
    if(btn){
      btn.addEventListener('click', function(){
        var curr = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        var nextTheme = curr === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
      });
    }
  }

  initTheme();

  var scroller = document.querySelector('.scroll-stack-scroller');
  if(!scroller) return;
  var inner = scroller.querySelector('.scroll-stack-inner');
  var cards = Array.prototype.slice.call(scroller.querySelectorAll('.scroll-stack-card'));
  var endEl = scroller.querySelector('.scroll-stack-end');
  if(!cards.length) return;

  var config = {
    itemDistance: 100,
    itemScale: 0.03,
    itemStackDistance: 30,
    stackPosition: '20%',
    scaleEndPosition: '10%',
    baseScale: 0.85,
    rotationAmount: 0,
    blurAmount: 0,
    useWindowScroll: false
  };

  function calculateProgress(scrollTop, start, end){
    if(scrollTop < start) return 0;
    if(scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }

  function parsePercentage(value, containerHeight){
    if(typeof value === 'string' && value.indexOf('%') !== -1){
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }

  function getElementOffset(element){
    return element.offsetTop;
  }

  var isUpdating = false;
  var lastTransforms = new Map();

  // 固定樣式 + margin（只做一次）
  for(var i=0;i<cards.length;i++){
    var card = cards[i];
    if(i < cards.length - 1){
      card.style.marginBottom = config.itemDistance + 'px';
    }
    card.style.willChange = 'transform, filter';
    card.style.transformOrigin = 'top center';
    card.style.backfaceVisibility = 'hidden';
    card.style.perspective = '1000px';
    card.style.webkitPerspective = '1000px';
    card.style.transform = 'translateZ(0)';
    card.style.webkitTransform = 'translateZ(0)';
  }

  function updateCardTransforms(){
    if(isUpdating) return;
    isUpdating = true;

    var scrollTop = scroller.scrollTop;
    var containerHeight = scroller.clientHeight;
    var stackPositionPx = parsePercentage(config.stackPosition, containerHeight);
    var scaleEndPositionPx = parsePercentage(config.scaleEndPosition, containerHeight);
    var endElementTop = endEl ? getElementOffset(endEl) : 0;

    for(var i=0;i<cards.length;i++){
      var card = cards[i];
      var cardTop = getElementOffset(card);
      var triggerStart = cardTop - stackPositionPx - config.itemStackDistance * i;
      var triggerEnd = cardTop - scaleEndPositionPx;
      var pinStart = triggerStart;
      var pinEnd = endElementTop - containerHeight / 2;

      var scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      var targetScale = config.baseScale + i * config.itemScale;
      var scale = 1 - scaleProgress * (1 - targetScale);
      var rotation = config.rotationAmount ? i * config.rotationAmount * scaleProgress : 0;

      var translateY = 0;
      var isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
      if(isPinned){
        translateY = scrollTop - cardTop + stackPositionPx + config.itemStackDistance * i;
      }else if(scrollTop > pinEnd){
        translateY = pinEnd - cardTop + stackPositionPx + config.itemStackDistance * i;
      }

      var newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: 0
      };

      var last = lastTransforms.get(i);
      var hasChanged = !last ||
        Math.abs(last.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(last.scale - newTransform.scale) > 0.001 ||
        Math.abs(last.rotation - newTransform.rotation) > 0.1;

      if(hasChanged){
        card.style.transform =
          'translate3d(0, ' + newTransform.translateY + 'px, 0) scale(' + newTransform.scale + ') rotate(' + newTransform.rotation + 'deg)';
        card.style.filter = '';
        lastTransforms.set(i, newTransform);
      }
    }

    isUpdating = false;
  }

  function start(){
    // 如果 Lenis 可用，就用它做平滑滾動；否則 fallback 到原生 scroll 事件
    if(window.Lenis){
      try{
        var lenis = new window.Lenis({
          wrapper: scroller,
          content: inner,
          duration: 1.2,
          easing: function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          smoothWheel: true,
          touchMultiplier: 2,
          infinite: false,
          wheelMultiplier: 1,
          lerp: 0.1,
          syncTouch: true,
          syncTouchLerp: 0.075,
          gestureOrientationHandler: true,
          normalizeWheel: true,
          touchInertiaMultiplier: 35,
          syncTouchLerp: 0.075,
          touchInertia: 0.6
        });
        lenis.on('scroll', function(){
          updateCardTransforms();
        });
        function raf(time){
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }catch(e){
        scroller.addEventListener('scroll', function(){ updateCardTransforms(); }, { passive: true });
      }
    }else{
      scroller.addEventListener('scroll', function(){ updateCardTransforms(); }, { passive: true });
    }

    updateCardTransforms();
    window.addEventListener('resize', function(){ updateCardTransforms(); });
  }

  if(!window.Lenis){
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js';
    script.async = true;
    script.onload = start;
    script.onerror = start;
    document.head.appendChild(script);
  }else{
    start();
  }
})();`;

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LuminaCMS</title>
    <style>${css}</style>
  </head>
  <body>
    <header class="nav">
      <div class="nav-inner">
        <div class="brand">
          <div class="brand-dot">✦</div>
          <div class="brand-title">K.S.H_LuminaCMS</div>
        </div>

        <button id="lcms-theme-toggle" type="button" aria-label="切換主題" title="切換主題">☀ 淺色</button>
      </div>
    </header>

    <section class="hero">
      <div class="hero-card">
        <div class="hero-kicker">LuminaCMS</div>
        <h1 class="hero-title">已發布文章</h1>
        <p class="hero-sub">以下內容來自本機資料庫中「已發布」的文章清單。點擊卡片即可開啟。</p>
      </div>
    </section>

    <section class="mt-4">
      <div class="scroll-stack-scroller">
        <div class="scroll-stack-inner">
          ${items}
          <div class="scroll-stack-end"></div>
        </div>
      </div>
    </section>

    <script>${scrollInitScript}</script>
  </body>
</html>`;
}

function injectHomeButtonToArticleHtml(
  html: string,
  homeUrl: string,
): string {
  const safeHomeUrl = homeUrl.replace(/"/g, "&quot;");
  const buttonHtml = `
<style>
  .lcms-home-btn{
    position:fixed;
    right:18px;
    bottom:18px;
    z-index:999;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:10px 14px;
    border-radius:999px;
    text-decoration:none;
    font-weight:700;
    font-size:13px;
    letter-spacing:0.01em;
    color:#111;
    background:rgba(255,255,255,0.78);
    border:1px solid rgba(0,0,0,0.08);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
    box-shadow:0 10px 30px rgba(0,0,0,0.10);
  }
  .lcms-home-btn:hover{
    background:rgba(255,255,255,0.92);
  }
  @media (prefers-color-scheme: dark){
    .lcms-home-btn{
      color:#f5f5f7;
      background:rgba(20,20,22,0.62);
      border:1px solid rgba(255,255,255,0.10);
      box-shadow:0 14px 40px rgba(0,0,0,0.40);
    }
    .lcms-home-btn:hover{
      background:rgba(20,20,22,0.78);
    }
  }
</style>
<a class="lcms-home-btn" href="${safeHomeUrl}" aria-label="返回首頁" title="返回首頁">← 返回首頁</a>
`.trim();

  if (html.includes("</body>")) {
    return html.replace("</body>", `${buttonHtml}\n</body>`);
  }
  return `${html}\n${buttonHtml}`;
}

// ─── 環境變數 ──────────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com";
const TOKEN  = process.env.GITHUB_TOKEN  ?? "";
const OWNER  = process.env.GITHUB_OWNER  ?? "";
const REPO   = process.env.GITHUB_REPO   ?? "";
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

/** 共用 GitHub API 請求 headers */
const GH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "LuminaCMS/1.0",
};

// ─── GitHub 錯誤詳情型別 ───────────────────────────────────────────────────────
type GitHubErrorBody = {
  message?: string;
  errors?: { resource?: string; code?: string; field?: string; message?: string }[];
  documentation_url?: string;
};

/** 從 GitHub API 回應建構可讀的錯誤訊息 */
function buildGhError(status: number, body: GitHubErrorBody, ctx: string): string {
  const parts: string[] = [`[${ctx}] GitHub ${status}`];
  if (body.message) parts.push(body.message);
  if (body.errors?.length) {
    parts.push(
      body.errors.map((e) => [e.resource, e.field, e.code, e.message].filter(Boolean).join(" / ")).join(" | "),
    );
  }
  if (body.documentation_url) parts.push(`→ ${body.documentation_url}`);
  return parts.join(" — ");
}

// ─── GitHub REST 輔助函式 ──────────────────────────────────────────────────────

/**
 * 取得指定路徑的現有 SHA。
 *
 * 回傳規則：
 *   - 檔案存在   → { sha: string,  exists: true  }
 *   - 檔案不存在 → { sha: null,    exists: false }
 *   - 真實錯誤   → throw（包含 GitHub 完整錯誤訊息）
 */
async function getFileSha(
  filePath: string,
): Promise<{ sha: string | null; exists: boolean }> {
  const url =
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}` +
    `?ref=${encodeURIComponent(BRANCH)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: GH_HEADERS, cache: "no-store" });
  } catch (e) {
    throw new Error(`[getFileSha] 網路錯誤：${String(e)}`);
  }

  // 404 表示檔案尚不存在，屬於正常情況（首次建立）
  if (res.status === 404) {
    return { sha: null, exists: false };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as GitHubErrorBody;
    throw new Error(buildGhError(res.status, body, `getFileSha(${filePath})`));
  }

  const data = await res.json() as { sha?: string };
  return { sha: data.sha ?? null, exists: true };
}

/**
 * 建立或更新 GitHub 倉庫中的檔案（PUT）。
 *
 * 409 衝突自動重試：
 *   若 PUT 回傳 409（SHA 在 GET/PUT 之間被更新），
 *   自動重新取得最新 SHA 並重試一次，避免因 TOCTOU 競爭造成的失敗。
 */
async function putGitHubFile(
  filePath: string,
  contentBase64: string,
  message: string,
  sha: string | null,
): Promise<{ htmlUrl: string }> {
  const doRequest = async (currentSha: string | null) => {
    const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
    const reqBody: Record<string, unknown> = {
      message,
      content: contentBase64,
      branch: BRANCH,
    };
    if (currentSha) reqBody.sha = currentSha;

    console.log(
      `[publish] PUT ${filePath} | sha=${currentSha ?? "new"} | branch=${BRANCH}`,
    );

    return fetch(url, {
      method: "PUT",
      headers: { ...GH_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
  };

  let res = await doRequest(sha);

  // 409：SHA 過期 → 重新抓取最新 SHA 並重試一次
  if (res.status === 409) {
    console.warn(
      `[publish] 409 conflict on ${filePath}, fetching fresh SHA and retrying…`,
    );
    const { sha: freshSha } = await getFileSha(filePath);
    res = await doRequest(freshSha);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as GitHubErrorBody;
    const msg = buildGhError(res.status, body, `putGitHubFile(${filePath})`);
    console.error(`[publish] ✕ ${msg}`);
    throw new Error(msg);
  }

  const data = await res.json() as { content?: { html_url?: string } };
  console.log(`[publish] ✓ ${filePath}`);
  return { htmlUrl: data.content?.html_url ?? "" };
}

// ─── 發布結果型別 ──────────────────────────────────────────────────────────────
type FileResult = {
  path: string;
  status: "ok" | "skipped" | "error";
  error?: string;
};

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 0. 環境變數檢查 ──────────────────────────────────────────────────────────
  if (!TOKEN || !OWNER || !REPO) {
    return NextResponse.json(
      {
        error: "GITHUB_NOT_CONFIGURED",
        hint: "請在 .env 中設定以下環境變數：GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
        missing: [
          !TOKEN && "GITHUB_TOKEN",
          !OWNER && "GITHUB_OWNER",
          !REPO  && "GITHUB_REPO",
        ].filter(Boolean),
      },
      { status: 503 },
    );
  }

  // ── 1. 解析請求 ──────────────────────────────────────────────────────────────
  const reqBody = await req.json().catch(() => null) as { postId?: string } | null;
  if (!reqBody?.postId) {
    return NextResponse.json({ error: "POST_ID_REQUIRED" }, { status: 400 });
  }

  // ── 2. 從 SQLite 讀取文章 ─────────────────────────────────────────────────────
  const post = db
    .prepare(
      "SELECT id, slug, title, htmlSnapshot FROM Post WHERE id = ? LIMIT 1",
    )
    .get(reqBody.postId) as
    | { id: string; slug: string; title: string; htmlSnapshot: string }
    | undefined;

  if (!post) {
    return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
  }

  if (!post.htmlSnapshot?.trim()) {
    return NextResponse.json(
      { error: "NO_HTML_SNAPSHOT", hint: "請先儲存/發布文章以產生 HTML 快照" },
      { status: 422 },
    );
  }

  console.log(`[publish] 開始發布文章 id=${post.id} slug=${post.slug}`);

  // ── 3. 掃描 htmlSnapshot 中的圖片路徑 ────────────────────────────────────────
  const imgMatches = [
    ...post.htmlSnapshot.matchAll(/(?:src|srcset)="(\/uploads\/[^"]+)"/g),
  ];
  const imgPaths = [...new Set(imgMatches.map((m) => m[1]))];
  console.log(`[publish] 發現 ${imgPaths.length} 張圖片：`, imgPaths);

  const UPLOAD_ROOT = path.join(process.cwd(), "public");
  const fileResults: FileResult[] = [];

  // ── 4. 上傳圖片到 GitHub（先確認 SHA，再 PUT）────────────────────────────────
  for (const imgPath of imgPaths) {
    const localPath = path.join(UPLOAD_ROOT, imgPath);
    const ghPath = imgPath.replace(/^\//, "");  // /uploads/... → uploads/...

    try {
      // 確認本地檔案存在
      await fs.access(localPath);
      const fileBuffer = await fs.readFile(localPath);
      const imgBase64 = fileBuffer.toString("base64");

      // 取得現有 SHA（區分 404/真實錯誤）
      const { sha: imgSha, exists } = await getFileSha(ghPath);
      console.log(
        `[publish] 圖片 ${ghPath} ${exists ? `已存在 sha=${imgSha}` : "（新檔案）"}`,
      );

      await putGitHubFile(ghPath, imgBase64, `assets: sync ${imgPath}`, imgSha);
      fileResults.push({ path: ghPath, status: "ok" });
    } catch (e) {
      const errMsg = String(e);
      console.error(`[publish] 圖片上傳失敗 ${ghPath}：${errMsg}`);
      fileResults.push({ path: ghPath, status: "error", error: errMsg });
      // 圖片失敗不中斷整體流程，繼續上傳其他圖片與 HTML
    }
  }

  // ── 5. 上傳 HTML 到 GitHub（先修正圖片路徑）──────────────────────────────────
  const htmlGhPath = `posts/${post.slug}.html`;
  let htmlGhUrl = "";

  try {
    // 將 /uploads/... 重寫為 /{REPO}/uploads/...，符合 GitHub Pages 路徑結構
    const patchedHtml = rewriteImagePathsForGitHubPages(post.htmlSnapshot, REPO);
    // 每篇文章都加上「返回首頁」按鈕（GitHub Pages 首頁）
    const homeUrl = `https://${OWNER}.github.io/${REPO}/`;
    const patchedHtmlWithHome = injectHomeButtonToArticleHtml(
      patchedHtml,
      homeUrl,
    );
    const htmlBase64 = Buffer.from(patchedHtmlWithHome, "utf-8").toString("base64");
    const { sha: htmlSha, exists: htmlExists } = await getFileSha(htmlGhPath);
    console.log(
      `[publish] HTML ${htmlGhPath} ${htmlExists ? `已存在 sha=${htmlSha}` : "（新檔案）"}`,
    );

    const { htmlUrl } = await putGitHubFile(
      htmlGhPath,
      htmlBase64,
      `publish: ${post.title}`,
      htmlSha,
    );
    htmlGhUrl = htmlUrl;
    fileResults.push({ path: htmlGhPath, status: "ok" });
  } catch (e) {
    const errMsg = String(e);
    console.error(`[publish] HTML 上傳失敗：${errMsg}`);
    fileResults.push({ path: htmlGhPath, status: "error", error: errMsg });
    return NextResponse.json(
      { error: "HTML_UPLOAD_FAILED", detail: errMsg, results: fileResults },
      { status: 500 },
    );
  }

  // ── 6. 生成並上傳首頁 index.html（列出所有已發布文章）────────────────────────
  try {
    const published = db
      .prepare(
        `SELECT slug, title, createdAt, publishedAt
         FROM Post
         WHERE publishedUrl IS NOT NULL AND TRIM(publishedUrl) <> ''
         ORDER BY rowid DESC`,
      )
      .all() as PublishedPostRow[];

    const indexHtml = buildIndexHtml(published);
    const indexBase64 = Buffer.from(indexHtml, "utf-8").toString("base64");
    const indexPath = "index.html";
    const { sha: indexSha, exists: indexExists } = await getFileSha(indexPath);
    console.log(
      `[publish] index.html ${indexExists ? `已存在 sha=${indexSha}` : "（新檔案）"}`,
    );
    await putGitHubFile(
      indexPath,
      indexBase64,
      `publish: update index (${post.slug})`,
      indexSha,
    );
    fileResults.push({ path: indexPath, status: "ok" });
  } catch (e) {
    const errMsg = String(e);
    console.warn(`[publish] index.html 上傳失敗（不影響文章發布）：${errMsg}`);
    fileResults.push({ path: "index.html", status: "error", error: errMsg });
  }

  // ── 7. 回傳成功結果 ────────────────────────────────────────────────────────────
  const pagesUrl = `https://${OWNER}.github.io/${REPO}/posts/${post.slug}.html`;
  const homePagesUrl = `https://${OWNER}.github.io/${REPO}/`;
  const failedImages = fileResults.filter(
    (r) => r.path !== htmlGhPath && r.status === "error",
  );

  // ── 6.1 回寫發布狀態到 SQLite（publishedUrl/publishedAt）───────────────────────
  try {
    db.prepare(
      "UPDATE Post SET publishedUrl = ?, publishedAt = datetime('now') WHERE id = ?",
    ).run(pagesUrl, post.id);
  } catch (e) {
    console.warn("[publish] failed to update publishedUrl", e);
  }

  console.log(
    `[publish] 完成 slug=${post.slug} | 成功圖片：${imgPaths.length - failedImages.length}/${imgPaths.length}`,
  );

  return NextResponse.json({
    ok: true,
    slug: post.slug,
    title: post.title,
    htmlGhUrl,
    pagesUrl,
    homePagesUrl,
    imageCount: imgPaths.length,
    imageFailCount: failedImages.length,
    results: fileResults,
  });
}
