/**
 * terminaltemplates.tsx（Template CSS）
 *
 * 注意：`app/src/lib/templates` 目標是提供「模板 CSS」，
 * 讓文章輸出的 HTML snapshot 能在無 JS 情況下呈現一致的背景風格。
 *
 * 這裡輸出一段 CSS 字串，會被寫入 Template.cssContent，並注入到輸出 HTML 的 <style>。
 */

import { getDefaultCss, getDarkCss } from "./default";

export function getTerminalTemplateCss(): string {
  const base = `
    /* 確保版型/寬度跟其他模板一致 */
    ${getDefaultCss()}
  `.trim();

  const overrides = `
    /* Light (default): 白底 + 終端機視窗卡片 */
    :root{
      --bg-body:#f6f7fb;
      --bg-card:#0b0f17; /* terminal window */
      --fg-primary:#111111;
      --fg-secondary:#6b7280;
      --accent:#16a34a;
      --radius-card:22px;
      --shadow-card:0 18px 60px rgba(0,0,0,0.10);
    }

    body{
      background:
        radial-gradient(900px 420px at 50% 0%, rgba(22,163,74,0.10), transparent 60%),
        radial-gradient(800px 420px at 15% 20%, rgba(37,99,235,0.08), transparent 60%),
        var(--bg-body);
      background-attachment: fixed;
    }

    /* subtle scanlines / noise */
    body::before{
      content:"";
      position:fixed; inset:0;
      pointer-events:none;
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,0.05) 0px,
          rgba(255,255,255,0.05) 1px,
          transparent 2px,
          transparent 6px
        );
      opacity:0.18;
      mix-blend-mode:overlay;
    }

    .lcms-nav{
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 8px 30px rgba(0,0,0,0.10);
      backdrop-filter: blur(18px);
    }
    .lcms-nav-title{ color: var(--fg-secondary); }
    .lcms-nav-dot{
      background: linear-gradient(135deg, #22c55e, #0ea5e9);
      box-shadow: 0 0 0 3px rgba(34,197,94,0.25);
    }

    .lcms-card{
      position: relative;
      padding-top: 52px;
      background: linear-gradient(180deg, rgba(11,15,23,0.98), rgba(7,10,15,0.96));
      border: 1px solid rgba(22,163,74,0.22);
      box-shadow: 0 30px 80px rgba(0,0,0,0.40);
      overflow: hidden;
    }
    /* Terminal window top bar */
    .lcms-card::before{
      content:"";
      position:absolute;
      left:0; right:0; top:0;
      height:46px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.00));
      border-bottom: 1px solid rgba(34,197,94,0.12);
    }
    /* 3 dots */
    .lcms-card::after{
      content:"";
      position:absolute;
      top:16px;
      left:20px;
      width:10px;height:10px;border-radius:999px;
      background:#ef4444;
      box-shadow:
        18px 0 0 #f59e0b,
        36px 0 0 #22c55e;
      opacity:0.95;
    }

    /* Monospace vibe */
    .lcms-meta{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      letter-spacing: 0.02em;
    }
    .lcms-title{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      letter-spacing: -0.01em;
    }
    .lcms-content{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .lcms-content p{ color: rgba(229,231,235,0.92); }
    .lcms-content code{
      background: rgba(34,197,94,0.10);
      border: 1px solid rgba(34,197,94,0.18);
      padding: 0.12em 0.35em;
      border-radius: 8px;
    }

    .lcms-meta{ color: rgba(148,163,184,0.9); }
    .lcms-meta-dot{ background: var(--fg-secondary); opacity:0.45; }
    .lcms-title{ color: rgba(229,231,235,0.98); }
    .lcms-content{ color: rgba(229,231,235,0.96); }
    .lcms-content a{ color: rgba(34,197,94,0.98); }
    .lcms-content a:hover{ text-decoration: underline; }

    /* Dark mode：整體背景也進入暗色終端機氛圍 */
    @media (prefers-color-scheme: dark){
      ${getDarkCss()}
      :root{ --accent:#22c55e; }
      body{
        background:
          radial-gradient(1200px 520px at 50% 0%, rgba(34,197,94,0.18), transparent 62%),
          radial-gradient(900px 520px at 15% 20%, rgba(56,189,248,0.10), transparent 60%),
          var(--bg-body);
        background-attachment: fixed;
      }
      .lcms-nav{
        background: rgba(3,7,18,0.72);
        border: 1px solid rgba(34,197,94,0.18);
        box-shadow: 0 8px 30px rgba(0,0,0,0.55);
      }
      .lcms-card{
        border-color: rgba(34,197,94,0.18);
        box-shadow: 0 30px 90px rgba(0,0,0,0.70);
      }
    }
  `.trim();

  return `${base}\n\n${overrides}`.trim();
}