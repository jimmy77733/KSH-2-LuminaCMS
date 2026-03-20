// ─── CSS 主題定義 ──────────────────────────────────────────────────────────────

export function getDefaultCss(): string {
  return `
    :root {
      --bg-body: #F5F5F7;
      --bg-card: #FFFFFF;
      --fg-primary: #111111;
      --fg-secondary: #6e6e73;
      --accent: #0071e3;
      --radius-card: 24px;
      --shadow-card: 0 18px 40px rgba(0,0,0,0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 40px;
      background: var(--bg-body);
      color: var(--fg-primary);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
        system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .lcms-shell { max-width: 960px; margin: 0 auto; }
    .lcms-nav {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 18px; margin-bottom: 16px; border-radius: 999px;
      background: rgba(255,255,255,0.72);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    }
    .lcms-nav-title {
      font-size: 13px; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--fg-secondary);
    }
    .lcms-nav-dot {
      width: 8px; height: 8px; border-radius: 999px;
      background: linear-gradient(135deg, #34C759, #0A84FF);
      box-shadow: 0 0 0 3px rgba(52,199,89,0.35);
    }
    .lcms-card {
      max-width: 800px; margin: 0 auto;
      border-radius: var(--radius-card);
      background: var(--bg-card);
      box-shadow: var(--shadow-card);
      padding: 32px 28px 36px;
    }
    @media (min-width: 768px) { .lcms-card { padding: 40px 40px 44px; } }
    .lcms-meta {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--fg-secondary); margin-bottom: 12px;
    }
    .lcms-meta-dot {
      width: 4px; height: 4px; border-radius: 999px;
      background: var(--fg-secondary); opacity: 0.4;
    }
    .lcms-title { margin: 0 0 18px; font-size: 28px; line-height: 1.22; letter-spacing: -0.02em; }
    @media (min-width: 768px) { .lcms-title { font-size: 32px; } }
    .lcms-content { font-size: 15px; line-height: 1.7; color: var(--fg-primary); }
    .lcms-content p { margin: 0 0 1.1em; }
    .lcms-content h2, .lcms-content h3 { margin: 1.6em 0 0.7em; letter-spacing: -0.01em; }
    .lcms-content a { color: var(--accent); text-decoration: none; }
    .lcms-content a:hover { text-decoration: underline; }
  `.trim();
}

export function getDarkCss(): string {
  return `
    :root {
      --bg-body: #1c1c1e;
      --bg-card: #2c2c2e;
      --fg-primary: #f5f5f7;
      --fg-secondary: #98989d;
      --accent: #0a84ff;
      --radius-card: 24px;
      --shadow-card: 0 18px 40px rgba(0,0,0,0.5);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 40px;
      background: var(--bg-body);
      color: var(--fg-primary);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
        system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .lcms-shell { max-width: 960px; margin: 0 auto; }
    .lcms-nav {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 18px; margin-bottom: 16px; border-radius: 999px;
      background: rgba(44,44,46,0.85);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .lcms-nav-title {
      font-size: 13px; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--fg-secondary);
    }
    .lcms-nav-dot {
      width: 8px; height: 8px; border-radius: 999px;
      background: linear-gradient(135deg, #34C759, #0A84FF);
      box-shadow: 0 0 0 3px rgba(52,199,89,0.3);
    }
    .lcms-card {
      max-width: 800px; margin: 0 auto;
      border-radius: var(--radius-card);
      background: var(--bg-card);
      box-shadow: var(--shadow-card);
      padding: 32px 28px 36px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    @media (min-width: 768px) { .lcms-card { padding: 40px 40px 44px; } }
    .lcms-meta {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--fg-secondary); margin-bottom: 12px;
    }
    .lcms-meta-dot {
      width: 4px; height: 4px; border-radius: 999px;
      background: var(--fg-secondary); opacity: 0.4;
    }
    .lcms-title { margin: 0 0 18px; font-size: 28px; line-height: 1.22; letter-spacing: -0.02em; }
    @media (min-width: 768px) { .lcms-title { font-size: 32px; } }
    .lcms-content { font-size: 15px; line-height: 1.7; color: var(--fg-primary); }
    .lcms-content p { margin: 0 0 1.1em; }
    .lcms-content h2, .lcms-content h3 { margin: 1.6em 0 0.7em; letter-spacing: -0.01em; }
    .lcms-content a { color: var(--accent); text-decoration: none; }
    .lcms-content a:hover { text-decoration: underline; }
  `.trim();
}

export function getMinimalCss(): string {
  return `
    :root {
      --bg-body: #ffffff;
      --fg-primary: #111111;
      --fg-secondary: #999999;
      --accent: #111111;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 56px 16px 88px;
      background: var(--bg-body);
      color: var(--fg-primary);
      font-family: "Georgia", "Times New Roman", Georgia, serif;
      -webkit-font-smoothing: antialiased;
    }
    .lcms-shell { max-width: 680px; margin: 0 auto; }
    .lcms-nav { display: none; }
    .lcms-card { padding: 0; background: transparent; box-shadow: none; border-radius: 0; }
    .lcms-meta {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; color: var(--fg-secondary);
      letter-spacing: 0.08em; text-transform: uppercase;
      margin-bottom: 28px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .lcms-meta-dot {
      width: 3px; height: 3px; border-radius: 999px;
      background: var(--fg-secondary); opacity: 0.5;
    }
    .lcms-title {
      margin: 0 0 36px; font-size: 36px;
      line-height: 1.12; letter-spacing: -0.03em; font-weight: 700;
    }
    @media (min-width: 768px) { .lcms-title { font-size: 52px; } }
    .lcms-content { font-size: 18px; line-height: 1.8; }
    .lcms-content p { margin: 0 0 1.5em; }
    .lcms-content h2 { font-size: 26px; margin: 2em 0 0.8em; letter-spacing: -0.02em; }
    .lcms-content h3 { font-size: 21px; margin: 1.8em 0 0.6em; }
    .lcms-content a {
      color: var(--accent);
      border-bottom: 1px solid rgba(0,0,0,0.3);
      text-decoration: none;
    }
    .lcms-content a:hover { border-bottom-color: transparent; }
  `.trim();
}

// ─── Background Templates (純 CSS；用於 Template 選項) ─────────────────────────

export function getRetroGridTemplateCss(): string {
  const extra = `
    :root{
      --bg-body:#070a0f;
      --bg-card:#0b1220;
      --fg-primary:#e5e7eb;
      --fg-secondary:#94a3b8;
      --accent:#38bdf8;
      --shadow-card:0 18px 60px rgba(0,0,0,0.55);
    }
    body{
      background: radial-gradient(1100px 420px at 50% -10%, rgba(56,189,248,0.18), transparent 60%),
                  radial-gradient(900px 360px at 15% 12%, rgba(34,197,94,0.10), transparent 55%),
                  var(--bg-body);
    }
    body::after{
      content:"";
      position:fixed; inset:0;
      pointer-events:none;
      opacity:0.55;
      background-image:
        linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 0),
        linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 0);
      background-size:64px 64px;
      transform: perspective(220px) rotateX(65deg) translateY(-55%);
      transform-origin: 50% 0%;
      animation: lcms-retrogrid-scroll 15s linear infinite;
      mix-blend-mode:screen;
    }
    @keyframes lcms-retrogrid-scroll{
      from{transform: perspective(220px) rotateX(65deg) translateY(-55%)}
      to{transform: perspective(220px) rotateX(65deg) translateY(-10%)}
    }
  `.trim();
  return `${getDarkCss()}\n\n${extra}`.trim();
}

export function getFlickeringGridTemplateCss(): string {
  const extra = `
    body{
      background:
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.12) 1px, transparent 0) 0 0/10px 10px,
        linear-gradient(180deg, rgba(245,245,247,1), rgba(255,255,255,1));
    }
    body::after{
      content:"";
      position:fixed; inset:0;
      pointer-events:none;
      background:
        radial-gradient(circle at 10% 30%, rgba(0,0,0,0.06), transparent 35%),
        radial-gradient(circle at 70% 60%, rgba(0,0,0,0.05), transparent 38%);
      animation: lcms-flicker 1.8s steps(2,end) infinite;
      opacity:0.9;
      mix-blend-mode:multiply;
    }
    @keyframes lcms-flicker{50%{opacity:0.55}}
  `.trim();
  return `${getDefaultCss()}\n\n${extra}`.trim();
}

// ─── Background Templates (JS Canvas / WebGL；用於動態背景模板) ─────────────────

export function getLetterGlitchTemplateCss(): string {
  const extra = `
    :root {
      --bg-body: #000000;
      --bg-card: rgba(0, 0, 0, 0.55);
      --fg-primary: #e2fce8;
      --fg-secondary: #61dca3;
      --accent: #61b3dc;
      --radius-card: 24px;
      --shadow-card: 0 18px 60px rgba(0,0,0,0.7);
    }
    /* 深色後備放在 html 層，body 透明讓 canvas 穿透顯示 */
    html { background: #000; }
    body { background: transparent; }
    .lcms-nav {
      background: rgba(0, 0, 0, 0.72);
      border: 1px solid rgba(97, 220, 163, 0.18);
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    }
    .lcms-nav-title { color: var(--fg-secondary); }
    .lcms-nav-dot {
      background: linear-gradient(135deg, #61dca3, #61b3dc);
      box-shadow: 0 0 0 3px rgba(97,220,163,0.3);
    }
    .lcms-card {
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(97, 220, 163, 0.15);
      box-shadow: var(--shadow-card);
    }
    .lcms-title { color: #e2fce8; }
    .lcms-meta { color: var(--fg-secondary); }
    .lcms-content { color: rgba(226, 252, 232, 0.92); }
    .lcms-content a { color: var(--accent); }
  `.trim();
  return `${getDarkCss()}\n\n${extra}`.trim();
}

export function getDotGridTemplateCss(): string {
  const extra = `
    :root {
      --bg-body: #0a0814;
      --bg-card: rgba(39, 30, 55, 0.72);
      --fg-primary: #e8e2fc;
      --fg-secondary: #9b8ec4;
      --accent: #7c5cfc;
      --radius-card: 24px;
      --shadow-card: 0 18px 60px rgba(82,39,255,0.18);
    }
    /* 深色後備放在 html 層，body 透明讓 canvas 穿透顯示 */
    html { background: #0a0814; }
    body { background: transparent; }
    .lcms-nav {
      background: rgba(10, 8, 20, 0.82);
      border: 1px solid rgba(124, 92, 252, 0.22);
      box-shadow: 0 8px 30px rgba(0,0,0,0.55);
    }
    .lcms-nav-title { color: var(--fg-secondary); }
    .lcms-nav-dot {
      background: linear-gradient(135deg, #7c5cfc, #38bdf8);
      box-shadow: 0 0 0 3px rgba(124,92,252,0.3);
    }
    .lcms-card {
      background: rgba(39, 30, 55, 0.72);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(124, 92, 252, 0.18);
      box-shadow: var(--shadow-card);
    }
    .lcms-title { color: #e8e2fc; }
    .lcms-meta { color: var(--fg-secondary); }
    .lcms-content { color: rgba(232, 226, 252, 0.9); }
    .lcms-content a { color: var(--accent); }
  `.trim();
  return `${getDarkCss()}\n\n${extra}`.trim();
}

export function getGalaxyTemplateCss(): string {
  const extra = `
    :root {
      --bg-body: #000010;
      --bg-card: rgba(0, 0, 16, 0.48);
      --fg-primary: #f0f4ff;
      --fg-secondary: #94a3b8;
      --accent: #7dd3fc;
      --radius-card: 24px;
      --shadow-card: 0 18px 60px rgba(0,0,60,0.55);
    }
    /* 深色後備放在 html 層，body 透明讓 canvas 穿透顯示 */
    html { background: #000010; }
    body { background: transparent; }
    .lcms-nav {
      background: rgba(0, 0, 20, 0.75);
      border: 1px solid rgba(125, 211, 252, 0.15);
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    }
    .lcms-nav-title { color: var(--fg-secondary); }
    .lcms-nav-dot {
      background: linear-gradient(135deg, #7dd3fc, #a78bfa);
      box-shadow: 0 0 0 3px rgba(125,211,252,0.3);
    }
    .lcms-card {
      background: rgba(0, 0, 16, 0.48);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(125, 211, 252, 0.12);
      box-shadow: var(--shadow-card);
    }
    .lcms-title { color: #f0f4ff; }
    .lcms-meta { color: var(--fg-secondary); }
    .lcms-content { color: rgba(240, 244, 255, 0.88); }
    .lcms-content a { color: var(--accent); }
  `.trim();
  return `${getDarkCss()}\n\n${extra}`.trim();
}

// ─── HTML 骨架（含 {{CSS}} / {{TITLE}} / {{CONTENT}} / {{DATE}} 佔位符）────────

export interface TemplateShellOptions {
  /** 動態背景的 JS 腳本（挂載至 #lcms-bg-canvas）*/
  bgScript?: string;
}

export function getTemplateShell(cssContent?: string, opts?: TemplateShellOptions): string {
  const css = cssContent ?? getDefaultCss();
  const hasBg = !!opts?.bgScript;

  const layoutFix = `
    html, body { min-height: 100%; }
    body { min-height: 100vh; background-color: var(--bg-body); }
  `.trim();

  // 動態 canvas 背景：body 必須透明，canvas z-index:0，內容 z-index:1
  const bgLayerCss = hasBg
    ? `
    body { background: transparent !important; background-color: transparent !important; }
    #lcms-bg-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; display: block; }
    .lcms-shell { position: relative; z-index: 1; }
  `.trim()
    : "";

  const bgCanvasHtml = hasBg
    ? `\n    <canvas id="lcms-bg-canvas"></canvas>`
    : "";
  const bgScriptHtml = hasBg
    ? `\n    <script>\n${opts!.bgScript}\n    </script>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <style>
${css}
${layoutFix}
${hasBg ? bgLayerCss : ""}
    </style>
  </head>
  <body>${bgCanvasHtml}${bgScriptHtml}
    <div class="lcms-shell">
      <header class="lcms-nav">
        <div class="lcms-nav-title">LuminaCMS · Journal</div>
        <div class="lcms-nav-dot"></div>
      </header>
      <article class="lcms-card">
        <div class="lcms-meta">
          <span>{{DATE}}</span>
          <span class="lcms-meta-dot"></span>
          <span>LuminaCMS</span>
        </div>
        <h1 class="lcms-title">{{TITLE}}</h1>
        <section class="lcms-content">
          {{CONTENT}}
        </section>
      </article>
    </div>
  </body>
</html>`.trim();
}

// ─── 向後相容 ─────────────────────────────────────────────────────────────────

export function getDefaultTemplateHtml(): string {
  return getTemplateShell();
}

export function applyDefaultTemplate(params: {
  title: string;
  content: string;
  date: string;
}): string {
  return getTemplateShell()
    .replace(/{{TITLE}}/g, params.title)
    .replace(/{{CONTENT}}/g, params.content)
    .replace(/{{DATE}}/g, params.date);
}
