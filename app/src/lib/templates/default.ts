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

// ─── HTML 骨架（含 {{CSS}} / {{TITLE}} / {{CONTENT}} / {{DATE}} 佔位符）────────

export function getTemplateShell(cssContent?: string): string {
  const css = cssContent ?? getDefaultCss();
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <style>
${css}
    </style>
  </head>
  <body>
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
