/**
 * 將 Craft.js query.serialize() 產生的 JSON 轉換為 HTML 字串。
 * 序列化結構中每個 node 的 key 為 id，內容：
 *   { type: { resolvedName }, props, nodes: string[], displayName, isCanvas, hidden }
 */

// ─── 組件樣式字典（Component Style Registry）─────────────────────────────────
//
// 設計原則：
//   每個 Magic UI / 自訂組件只需在此登記一次靜態 CSS/SVG，
//   craftJsonToHtml 會自動偵測頁面使用了哪些組件，並只注入必要資產。
//
// 擴充方式：
//   1. 在下方 RegistryKey union type 新增組件名稱
//   2. 在 COMPONENT_STYLE_REGISTRY 物件中新增對應的 css / svg 定義
//   3. craftJsonToHtml 自動處理，無需修改轉換邏輯

type RegistryKey =
  | "MorphingTextComponent"
  // 未來擴充：在此新增類型
  // | "ShimmerButton"
  // | "Particles"
  // | "AnimatedBeam"
  ;

interface RegistryEntry {
  /** 注入到 HTML 頂部的 SVG 定義（如共用 filter、symbol）*/
  svg?: string;
  /** 注入到 HTML 頂部 <style> 的基底 CSS（不含實例化動畫）*/
  css?: string;
}

/**
 * 靜態資產字典 — 每個組件的共用 CSS/SVG 定義
 *
 * 核心思路：同一頁面可能有多個 MorphingText 實例，
 * 但 SVG feColorMatrix 閾值濾鏡只需定義一次，所有實例共享 #lcms-threshold。
 */
const COMPONENT_STYLE_REGISTRY: Partial<Record<RegistryKey, RegistryEntry>> = {
  MorphingTextComponent: {
    // 液態變形效果所需的 SVG 閾值濾鏡
    // 原理：feColorMatrix 將 alpha 通道做高對比拉伸（×255 - 140），
    //       搭配 CSS blur()，讓半透明模糊邊緣瞬間消失，形成液態融合視覺。
    svg: `<svg id="lcms-morph-filter" style="position:fixed;height:0;width:0;pointer-events:none;overflow:hidden" aria-hidden="true">
  <defs>
    <filter id="lcms-threshold">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"/>
    </filter>
  </defs>
</svg>`,
  },

  // ── 未來擴充預留位置 ─────────────────────────────────────────────────────
  // ShimmerButton: {
  //   css: `
  //     .lcms-shimmer-btn { position:relative; overflow:hidden; }
  //     .lcms-shimmer-btn::after {
  //       content:""; position:absolute; inset:0;
  //       background: linear-gradient(105deg,transparent 40%,rgba(255,255,255,.4) 50%,transparent 60%);
  //       animation: lcms-shimmer 2.5s infinite;
  //     }
  //     @keyframes lcms-shimmer { from{transform:translateX(-100%)} to{transform:translateX(100%)} }
  //   `,
  // },
};

// ─── 內部型別 ──────────────────────────────────────────────────────────────────
type SerializedNode = {
  type: { resolvedName: string };
  displayName: string;
  props: Record<string, unknown>;
  nodes: string[];
  linkedNodes: Record<string, string>;
  isCanvas: boolean;
  hidden: boolean;
};

type NodeTree = Record<string, SerializedNode>;

// ─── 工具函式 ──────────────────────────────────────────────────────────────────
function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 遞迴收集樹中用到哪些有注冊靜態資產的組件 */
function collectUsedComponents(
  nodeId: string,
  tree: NodeTree,
  out: Set<RegistryKey>,
): void {
  const node = tree[nodeId];
  if (!node || node.hidden) return;
  const name = node.type?.resolvedName ?? "";
  if (name in COMPONENT_STYLE_REGISTRY) out.add(name as RegistryKey);
  for (const childId of node.nodes ?? []) {
    collectUsedComponents(childId, tree, out);
  }
}

// ─── 節點轉 HTML ───────────────────────────────────────────────────────────────
function nodeToHtml(nodeId: string, tree: NodeTree): string {
  const node = tree[nodeId];
  if (!node || node.hidden) return "";

  const name = node.type?.resolvedName ?? "";
  const p = node.props ?? {};
  const childIds: string[] = node.nodes ?? [];
  const children = childIds.map((id) => nodeToHtml(id, tree)).join("\n");

  switch (name) {
    case "TextComponent": {
      const fw =
        p.weight === "bold" ? 700 : p.weight === "semibold" ? 600 : 400;
      return `<p style="font-size:${p.fontSize ?? 16}px;color:${p.color ?? "#111111"};font-weight:${fw};margin:0.4em 0;line-height:1.6">${esc(p.text)}</p>`;
    }

    case "MorphingTextComponent": {
      /**
       * 零 JS 版 MorphingText（Phase 4 核心）：
       *   - N 個 <span> 各自代表一段文字，以 CSS animation-delay stagger
       *   - 使用 COMPONENT_STYLE_REGISTRY 中注冊的共用 #lcms-threshold filter
       *   - 每實例只需注入自身的 @keyframes + 位置/色彩 CSS
       */
      const textsRaw = String(p.texts ?? "");
      const textList = textsRaw
        .split("\n")
        .map((t: string) => t.trim())
        .filter(Boolean);
      if (textList.length === 0) return "";

      const fs = Number(p.fontSize ?? 40);
      const color = String(p.color ?? "#111111");
      const align = String(p.align ?? "center");
      const n = textList.length;
      const totalDur = Math.max(n * 2.5, 5);
      const eachDur = totalDur / n;

      const eachPct    = (100 / n).toFixed(2);
      const fadeInPct  = (20 / n).toFixed(2);
      const holdPct    = (70 / n).toFixed(2);
      const fadeOutPct = (90 / n).toFixed(2);

      const uid = `mt_${Math.random().toString(36).slice(2, 8)}`;

      const keyframe =
        `@keyframes ${uid}_show{` +
        `0%{opacity:0;filter:blur(14px)}` +
        `${fadeInPct}%{opacity:1;filter:blur(0)}` +
        `${holdPct}%{opacity:1;filter:blur(0)}` +
        `${fadeOutPct}%{opacity:0;filter:blur(14px)}` +
        `${eachPct}%,100%{opacity:0;filter:blur(14px)}}`;

      const justifyContent =
        align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

      const spanTags = textList
        .map((text: string, i: number) => {
          const delay = (i * eachDur).toFixed(2);
          return `<span style="animation-delay:${delay}s">${esc(text)}</span>`;
        })
        .join("\n");

      // 注意：SVG filter 由 craftJsonToHtml 從 Registry 注入一次，此處直接引用 #lcms-threshold
      return `<style>
${keyframe}
.${uid}{position:relative;height:${Math.round(fs * 1.5)}px;margin:0.8em 0;text-align:${align};filter:url(#lcms-threshold) blur(0.5px);}
.${uid} span{position:absolute;inset:0;display:flex;align-items:center;justify-content:${justifyContent};font-size:${fs}px;font-weight:700;color:${color};line-height:1;opacity:0;animation:${uid}_show ${totalDur.toFixed(1)}s ease-in-out infinite;}
</style>
<div class="${uid}" aria-label="${esc(textList.join(" / "))}">
${spanTags}
</div>`;
    }

    case "ImageComponent": {
      const src =
        (p.large as string) ||
        (p.small as string) ||
        (p.thumb as string) ||
        (p.src as string) ||
        "";
      if (!src) return "";
      const alt = esc(p.alt);

      let wrapStyle = "";
      let imgStyle = "width:100%;display:block;";
      const bs = String(p.borderStyle ?? "ios-inset");
      if (bs === "ios-inset") {
        wrapStyle =
          "border-radius:20px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,0.08);padding:4px;margin:12px 0;overflow:hidden";
        imgStyle += "border-radius:16px;";
      } else if (bs === "floating") {
        wrapStyle =
          "border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.18);margin:16px 0;overflow:hidden";
        imgStyle += "border-radius:20px;";
      } else {
        wrapStyle = "margin:12px 0";
        imgStyle += "border-radius:0;";
      }

      let inner = "";
      if (p.small)
        inner += `<source srcset="${p.small}" media="(max-width:640px)" type="image/webp">`;
      if (p.large)
        inner += `<source srcset="${p.large}" type="image/webp">`;
      inner += `<img src="${src}" alt="${alt}" style="${imgStyle}">`;
      return `<div style="${wrapStyle}"><picture>${inner}</picture></div>`;
    }

    case "Container": {
      const pad = (p.padding as number) ?? 24;
      const variant = String(p.variant ?? "default");

      let boxStyle = `padding:${pad}px;border-radius:24px;margin:12px 0;`;
      if (variant === "glass") {
        boxStyle += "background:rgba(255,255,255,0.6);box-shadow:0 8px 32px rgba(0,0,0,0.1);border:1px solid rgba(255,255,255,0.6);";
      } else if (variant === "tech") {
        boxStyle += "background:#09090b;box-shadow:0 0 0 1px rgba(0,113,227,0.4),0 8px 32px rgba(0,113,227,0.15);";
      } else if (variant === "dark") {
        boxStyle += "background:#18181b;box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);";
      } else {
        boxStyle += "background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.08);";
      }

      return `<div style="${boxStyle}">${children}</div>`;
    }

    // CanvasContainer / Root Canvas — 透明容器
    default:
      return children;
  }
}

// ─── 公開 API ──────────────────────────────────────────────────────────────────
/**
 * 將 Craft.js 序列化 JSON 轉為 HTML 片段（不含模板外殼）。
 *
 * 流程：
 *   1. 掃描節點樹，收集使用到的組件（collectUsedComponents）
 *   2. 從 COMPONENT_STYLE_REGISTRY 取出對應的 SVG/CSS 並前置注入
 *   3. 遞迴轉換各節點為 HTML 字串
 *
 * @param contentJson - query.serialize() 的輸出字串
 * @returns HTML 字串（含共用 SVG filter + 各實例 CSS），失敗時回傳空字串
 */
export function craftJsonToHtml(contentJson: string): string {
  if (!contentJson || contentJson === "{}") return "";
  try {
    const tree = JSON.parse(contentJson) as NodeTree;

    // Step 1：收集使用到的組件
    const usedComponents = new Set<RegistryKey>();
    collectUsedComponents("ROOT", tree, usedComponents);

    // Step 2：產生各節點 HTML
    const contentHtml = nodeToHtml("ROOT", tree);

    // Step 3：建立靜態資產前置區塊
    const assetParts: string[] = [];
    for (const key of usedComponents) {
      const entry = COMPONENT_STYLE_REGISTRY[key];
      if (!entry) continue;
      if (entry.svg) assetParts.push(entry.svg);
      if (entry.css) assetParts.push(`<style>${entry.css}</style>`);
    }

    if (assetParts.length === 0) return contentHtml;
    return assetParts.join("\n") + "\n" + contentHtml;
  } catch {
    return "";
  }
}
