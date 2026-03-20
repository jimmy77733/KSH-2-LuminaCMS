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
  | "TerminalComponent"
  | "ScrolltextComponent"
  | "RetroGridComponent"
  | "FlickeringGridComponent"
  | "CircularGalleryComponent"
  | "PixelCardComponent"
  | "StepperComponent"
  | "DecryptedTextComponent"
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

  TerminalComponent: {
    css: `
      .lcms-terminal{
        border-radius:16px;
        border:1px solid rgba(0,0,0,0.08);
        background:#ffffff;
        box-shadow:0 10px 30px rgba(0,0,0,0.06);
        overflow:hidden;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      .lcms-terminal-head{display:flex;gap:8px;padding:14px 16px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(245,245,247,0.8)}
      .lcms-dot{width:9px;height:9px;border-radius:999px}
      .lcms-dot.r{background:#ef4444}.lcms-dot.y{background:#f59e0b}.lcms-dot.g{background:#22c55e}
      .lcms-terminal-body{padding:14px 16px;font-size:13px;line-height:1.6;color:#111}
      .lcms-terminal-line{white-space:pre-wrap;word-break:break-word}
    `.trim(),
  },

  ScrolltextComponent: {
    css: `
      .lcms-scrolltext{position:relative;overflow:hidden;white-space:nowrap;border-radius:14px;border:1px solid rgba(0,0,0,0.06);background:#fff;box-shadow:0 6px 20px rgba(0,0,0,0.05)}
      .lcms-scrolltext-track{display:inline-flex;align-items:center;will-change:transform}
      @keyframes lcms-marquee-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @keyframes lcms-marquee-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}
    `.trim(),
  },

  RetroGridComponent: {
    css: `
      .lcms-retrogrid{
        position:relative;overflow:hidden;border-radius:24px;
        background: radial-gradient(1200px 400px at 50% 0%, rgba(56,189,248,0.22), transparent 60%),
                    linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.65));
      }
      .lcms-retrogrid::before{
        content:"";position:absolute;inset:-40% -80%;
        background-image:
          linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 0),
          linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 0);
        background-size:64px 64px;
        transform: perspective(220px) rotateX(65deg) translateY(-40%);
        animation: lcms-retrogrid-scroll 15s linear infinite;
        opacity:0.55;
      }
      @keyframes lcms-retrogrid-scroll{
        from{transform: perspective(220px) rotateX(65deg) translateY(-55%)}
        to{transform: perspective(220px) rotateX(65deg) translateY(-10%)}
      }
    `.trim(),
  },

  FlickeringGridComponent: {
    css: `
      .lcms-flickergrid{
        position:relative;overflow:hidden;border-radius:24px;
        background:
          radial-gradient(circle at 1px 1px, rgba(0,0,0,0.14) 1px, transparent 0) 0 0/10px 10px,
          linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.9));
      }
      .lcms-flickergrid::after{
        content:"";position:absolute;inset:0;
        background: radial-gradient(circle at 10% 30%, rgba(0,0,0,0.08), transparent 35%),
                    radial-gradient(circle at 70% 60%, rgba(0,0,0,0.06), transparent 38%);
        animation: lcms-flicker 1.8s steps(2,end) infinite;
        opacity:0.9;
        mix-blend-mode:multiply;
      }
      @keyframes lcms-flicker{50%{opacity:0.55}}
    `.trim(),
  },

  CircularGalleryComponent: {
    css: `
      .lcms-circular-gallery{
        position:relative;overflow:hidden;border-radius:24px;margin:14px 0;
        background:#09090b;display:flex;gap:12px;padding:16px;
        align-items:center;
      }
      .lcms-gallery-item{
        flex:0 0 auto;width:200px;height:130px;border-radius:14px;overflow:hidden;
        background:#27272a;
        transition:transform 0.3s;
      }
      .lcms-gallery-item img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(100%)}
      .lcms-gallery-label{
        position:absolute;bottom:0;left:0;right:0;padding:6px 10px;
        background:linear-gradient(transparent,rgba(0,0,0,0.7));
        color:#fff;font-size:11px;font-weight:600;text-align:center;
      }
    `.trim(),
  },

  PixelCardComponent: {
    css: `
      .lcms-pixel-card{
        position:relative;overflow:hidden;border-radius:24px;margin:14px 0;
        border:1px solid #27272a;background:#09090b;display:grid;place-items:center;
        isolation:isolate;
      }
      .lcms-pixel-card::before{
        content:"";position:absolute;inset:0;
        background:radial-gradient(circle, #09090b, transparent 85%);
        opacity:0.8;
      }
      @keyframes lcms-pixel-shimmer{0%,100%{opacity:0.3}50%{opacity:0.7}}
      .lcms-pixel-card-content{
        position:relative;z-index:1;width:100%;height:100%;
        display:flex;align-items:center;justify-content:center;
      }
    `.trim(),
  },

  StepperComponent: {
    css: `
      .lcms-stepper{
        border-radius:24px;overflow:hidden;margin:14px 0;
        border:1px solid #27272a;background:#fff;
        box-shadow:0 8px 30px rgba(0,0,0,0.06);
        max-width:480px;
      }
      .lcms-stepper-head{
        display:flex;align-items:center;gap:0;padding:20px 20px 0;
      }
      .lcms-step-circle{
        width:30px;height:30px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:700;flex-shrink:0;
        background:#5227FF;color:#fff;
      }
      .lcms-step-circle.done{background:#5227FF}
      .lcms-step-circle.inactive{background:#222;color:#a3a3a3}
      .lcms-step-line{flex:1;height:2px;background:#52525b;margin:0 6px}
      .lcms-step-line.done{background:#5227FF}
      .lcms-stepper-body{padding:20px}
      .lcms-stepper-title{font-size:16px;font-weight:700;margin:0 0 8px}
      .lcms-stepper-text{font-size:13px;color:#666;margin:0}
      .lcms-stepper-footer{
        display:flex;justify-content:flex-end;gap:8px;padding:0 20px 20px;
      }
      .lcms-stepper-btn{
        border-radius:999px;background:#5227FF;color:#fff;
        font-size:13px;font-weight:500;padding:6px 18px;border:none;cursor:pointer;
      }
      .lcms-stepper-btn:disabled{background:#e5e7eb;color:#6b7280;cursor:default;}
    `.trim(),
  },

  DecryptedTextComponent: {
    css: `
      @keyframes lcms-decrypt-blink{
        0%,100%{opacity:1}50%{opacity:0.3}
      }
      .lcms-decrypt-encrypted{
        color:#0071e3;
        animation:lcms-decrypt-blink 0.4s ease-in-out infinite;
      }
      .lcms-decrypt-revealed{color:inherit}
      .lcms-decrypt-wrap{
        display:inline-block;font-weight:700;letter-spacing:-0.01em;
      }
    `.trim(),
  },
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

    case "EvilEyeContainer": {
      const pad = (p.padding as number) ?? 24;
      const h = Number(p.height ?? 280);
      const eyeColorHex = String(p.eyeColor ?? "#FF6F37");
      const bgColorHex = String(p.backgroundColor ?? "#000000");
      const pupilSize = Number((p as Record<string, unknown>).pupilSize ?? 0.6);
      const irisWidth = Number((p as Record<string, unknown>).irisWidth ?? 0.25);
      const glowIntensity = Number((p as Record<string, unknown>).glowIntensity ?? 0.35);
      const intensity = Number((p as Record<string, unknown>).intensity ?? 1.5);
      const scale = Number((p as Record<string, unknown>).scale ?? 0.8);
      const noiseScale = Number((p as Record<string, unknown>).noiseScale ?? 1.0);
      const pupilFollow = Number((p as Record<string, unknown>).pupilFollow ?? 1.0);
      const flameSpeed = Number((p as Record<string, unknown>).flameSpeed ?? 1.0);

      function eeHexToF(hex: string): [number, number, number] {
        const hx = hex.replace("#", "");
        const r = parseInt(hx.slice(0, 2), 16) / 255;
        const g2 = parseInt(hx.slice(2, 4), 16) / 255;
        const b2 = parseInt(hx.slice(4, 6), 16) / 255;
        return [isNaN(r) ? 0 : r, isNaN(g2) ? 0 : g2, isNaN(b2) ? 0 : b2];
      }

      const [er, eg, eb] = eeHexToF(eyeColorHex);
      const [brr, brg, brb] = eeHexToF(bgColorHex);
      const uid = `ee${Math.random().toString(36).slice(2, 8)}`;

      // Build inline WebGL script – same shader as EvilEye.tsx but self-contained vanilla JS
      const eeScript = `(function(){
var ctn=document.getElementById('${uid}');
if(!ctn)return;
var canvas=document.createElement('canvas');
canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
ctn.insertBefore(canvas,ctn.firstChild);
var gl=canvas.getContext('webgl',{alpha:false})||canvas.getContext('experimental-webgl',{alpha:false});
if(!gl){ctn.style.background='radial-gradient(ellipse 80% 55% at 50% 50%,${eyeColorHex}99 0%,${eyeColorHex}44 35%,${bgColorHex} 60%)';return;}
gl.clearColor(${brr.toFixed(4)},${brg.toFixed(4)},${brb.toFixed(4)},1);
var SZ=256;
function eeHash(x,y,s){var n=((x*374761393+y*668265263+s*1274126177)|0);n=(Math.imul(n^(n>>>13),1274126177))|0;return((n^(n>>>16))>>>0)/4294967296;}
function eeNoise(px,py,freq,seed){var fx=(px/SZ)*freq,fy=(py/SZ)*freq;var ix=Math.floor(fx),iy=Math.floor(fy);var tx=fx-ix,ty=fy-iy;var w=freq|0;var v00=eeHash(((ix%w)+w)%w,((iy%w)+w)%w,seed);var v10=eeHash((((ix+1)%w)+w)%w,((iy%w)+w)%w,seed);var v01=eeHash(((ix%w)+w)%w,(((iy+1)%w)+w)%w,seed);var v11=eeHash((((ix+1)%w)+w)%w,(((iy+1)%w)+w)%w,seed);return v00*(1-tx)*(1-ty)+v10*tx*(1-ty)+v01*(1-tx)*ty+v11*tx*ty;}
var nd=new Uint8Array(SZ*SZ*4);
for(var ny=0;ny<SZ;ny++){for(var nx=0;nx<SZ;nx++){var nv=0,na=0.4,nta=0;for(var no=0;no<8;no++){var nf=32*(1<<no);nv+=na*eeNoise(nx,ny,nf,no*31);nta+=na;na*=0.65;}nv/=nta;nv=(nv-0.5)*2.2+0.5;nv=Math.max(0,Math.min(1,nv));var nval=Math.round(nv*255);var ni=(ny*SZ+nx)*4;nd[ni]=nval;nd[ni+1]=nval;nd[ni+2]=nval;nd[ni+3]=255;}}
var tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SZ,SZ,0,gl.RGBA,gl.UNSIGNED_BYTE,nd);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
var vs=['attribute vec2 uv;','attribute vec2 position;','varying vec2 vUv;','void main(){vUv=uv;gl_Position=vec4(position,0,1);}'].join('\\n');
var fs=['precision highp float;','uniform float uTime;uniform vec3 uResolution;uniform sampler2D uNoiseTexture;','uniform float uPupilSize;uniform float uIrisWidth;uniform float uGlowIntensity;','uniform float uIntensity;uniform float uScale;uniform float uNoiseScale;','uniform vec2 uMouse;uniform float uPupilFollow;uniform float uFlameSpeed;','uniform vec3 uEyeColor;uniform vec3 uBgColor;','void main(){','  vec2 uv=(gl_FragCoord.xy*2.0-uResolution.xy)/uResolution.y;','  uv/=uScale;','  float ft=uTime*uFlameSpeed;','  float polarRadius=length(uv)*2.0;','  float polarAngle=(2.0*atan(uv.x,uv.y))/6.28*0.3;','  vec2 polarUv=vec2(polarRadius,polarAngle);','  vec4 noiseA=texture2D(uNoiseTexture,polarUv*vec2(0.2,7.0)*uNoiseScale+vec2(-ft*0.1,0.0));','  vec4 noiseB=texture2D(uNoiseTexture,polarUv*vec2(0.3,4.0)*uNoiseScale+vec2(-ft*0.2,0.0));','  vec4 noiseC=texture2D(uNoiseTexture,polarUv*vec2(0.1,5.0)*uNoiseScale+vec2(-ft*0.1,0.0));','  float distanceMask=1.0-length(uv);','  float innerRing=clamp(-1.0*((distanceMask-0.7)/uIrisWidth),0.0,1.0);','  innerRing=(innerRing*distanceMask-0.2)/0.28;','  innerRing+=noiseA.r-0.5;innerRing*=1.3;innerRing=clamp(innerRing,0.0,1.0);','  float outerRing=clamp(-1.0*((distanceMask-0.5)/0.2),0.0,1.0);','  outerRing=(outerRing*distanceMask-0.1)/0.38;','  outerRing+=noiseC.r-0.5;outerRing*=1.3;outerRing=clamp(outerRing,0.0,1.0);','  innerRing+=outerRing;','  float innerEye=distanceMask-0.1*2.0;innerEye*=noiseB.r*2.0;','  vec2 pupilOffset=uMouse*uPupilFollow*0.12;','  vec2 pupilUv=uv-pupilOffset;','  float pupil=1.0-length(pupilUv*vec2(9.0,2.3));','  pupil*=uPupilSize;pupil=clamp(pupil,0.0,1.0);pupil/=0.35;','  float outerEyeGlow=1.0-length(uv*vec2(0.5,1.5));','  outerEyeGlow=clamp(outerEyeGlow+0.5,0.0,1.0);outerEyeGlow+=noiseC.r-0.5;','  float outerBgGlow=outerEyeGlow;','  outerEyeGlow=pow(outerEyeGlow,2.0);outerEyeGlow+=distanceMask;','  outerEyeGlow*=uGlowIntensity;outerEyeGlow=clamp(outerEyeGlow,0.0,1.0);','  outerEyeGlow*=pow(1.0-distanceMask,2.0)*2.5;','  outerBgGlow+=distanceMask;outerBgGlow=pow(outerBgGlow,0.5);outerBgGlow*=0.15;','  vec3 color=uEyeColor*uIntensity*clamp(max(innerRing+innerEye,outerEyeGlow+outerBgGlow)-pupil,0.0,3.0);','  color+=uBgColor;','  gl_FragColor=vec4(color,1.0);','}'].join('\\n');
function mkS(type,src){var s=gl.createShader(type);if(!s)return null;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('[EvilEye shader]',gl.getShaderInfoLog(s));return null;}return s;}
var prog=gl.createProgram();if(!prog)return;
var vs2=mkS(gl.VERTEX_SHADER,vs),fs2=mkS(gl.FRAGMENT_SHADER,fs);
if(!vs2||!fs2)return;
gl.attachShader(prog,vs2);gl.attachShader(prog,fs2);gl.linkProgram(prog);
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.warn('[EvilEye link]',gl.getProgramInfoLog(prog));return;}
gl.useProgram(prog);
var posArr=new Float32Array([-1,-1,3,-1,-1,3]),uvArr=new Float32Array([0,0,2,0,0,2]);
function bindBuf(data,attr){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);var l=gl.getAttribLocation(prog,attr);if(l>=0){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);}}
bindBuf(posArr,'position');bindBuf(uvArr,'uv');
gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
gl.uniform1i(gl.getUniformLocation(prog,'uNoiseTexture'),0);
var u={time:gl.getUniformLocation(prog,'uTime'),res:gl.getUniformLocation(prog,'uResolution'),pupilSize:gl.getUniformLocation(prog,'uPupilSize'),irisWidth:gl.getUniformLocation(prog,'uIrisWidth'),glowIntensity:gl.getUniformLocation(prog,'uGlowIntensity'),intensity:gl.getUniformLocation(prog,'uIntensity'),scale:gl.getUniformLocation(prog,'uScale'),noiseScale:gl.getUniformLocation(prog,'uNoiseScale'),mouse:gl.getUniformLocation(prog,'uMouse'),pupilFollow:gl.getUniformLocation(prog,'uPupilFollow'),flameSpeed:gl.getUniformLocation(prog,'uFlameSpeed'),eyeColor:gl.getUniformLocation(prog,'uEyeColor'),bgColor:gl.getUniformLocation(prog,'uBgColor')};
gl.uniform1f(u.pupilSize,${pupilSize.toFixed(4)});gl.uniform1f(u.irisWidth,${irisWidth.toFixed(4)});gl.uniform1f(u.glowIntensity,${glowIntensity.toFixed(4)});
gl.uniform1f(u.intensity,${intensity.toFixed(4)});gl.uniform1f(u.scale,${scale.toFixed(4)});gl.uniform1f(u.noiseScale,${noiseScale.toFixed(4)});
gl.uniform1f(u.pupilFollow,${pupilFollow.toFixed(4)});gl.uniform1f(u.flameSpeed,${flameSpeed.toFixed(4)});
gl.uniform3f(u.eyeColor,${er.toFixed(4)},${eg.toFixed(4)},${eb.toFixed(4)});
gl.uniform3f(u.bgColor,${brr.toFixed(4)},${brg.toFixed(4)},${brb.toFixed(4)});
gl.uniform2f(u.mouse,0,0);
function eeResize(){var w=ctn.offsetWidth||300;var h2=ctn.offsetHeight||${h};canvas.width=w;canvas.height=h2;gl.viewport(0,0,w,h2);gl.uniform3f(u.res,w,h2,w/Math.max(h2,1));}
window.addEventListener('resize',eeResize);
var mx=0,my=0,tmx=0,tmy=0;
ctn.addEventListener('mousemove',function(e){var r=ctn.getBoundingClientRect();tmx=((e.clientX-r.left)/r.width)*2-1;tmy=-(((e.clientY-r.top)/r.height)*2-1);});
ctn.addEventListener('mouseleave',function(){tmx=0;tmy=0;});
function eeAnimate(t){requestAnimationFrame(eeAnimate);mx+=(tmx-mx)*0.05;my+=(tmy-my)*0.05;gl.uniform1f(u.time,t*0.001);gl.uniform2f(u.mouse,mx,my);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);}
requestAnimationFrame(function(){eeResize();requestAnimationFrame(eeAnimate);});
})();`;

      return `<div id="${uid}" style="padding:${pad}px;min-height:${h}px;border-radius:24px;margin:12px 0;position:relative;overflow:hidden;background:${bgColorHex};">
<script>${eeScript}<\/script>
<div style="position:relative;z-index:2;">${children}</div>
</div>`;
    }

    case "TerminalComponent": {
      const pp = p as Record<string, unknown>;
      const raw = String(pp.lines ?? "");
      const lines = raw
        .split("\n")
        .map((t: string) => t.replace(/\r/g, ""))
        .filter(Boolean);
      const body = lines
        .map((line: string) => `<div class="lcms-terminal-line">${esc(line)}</div>`)
        .join("");
      return `<div class="lcms-terminal" style="margin:14px 0">
  <div class="lcms-terminal-head">
    <span class="lcms-dot r"></span><span class="lcms-dot y"></span><span class="lcms-dot g"></span>
  </div>
  <div class="lcms-terminal-body">${body}</div>
</div>`;
    }

    case "ScrolltextComponent": {
      const pp = p as Record<string, unknown>;
      const text = esc(pp.text ?? "LuminaCMS · Scrolltext");
      const baseVelocity = Number(pp.baseVelocity ?? 6);
      const direction = Number(pp.direction ?? 1) === -1 ? -1 : 1;
      const seconds = Math.max(
        6,
        Math.round(24 - Math.min(20, Math.max(0, baseVelocity))),
      );
      const anim = direction === -1 ? "lcms-marquee-right" : "lcms-marquee-left";
      return `<div class="lcms-scrolltext" style="margin:14px 0;padding:10px 0">
  <div class="lcms-scrolltext-track" style="animation:${anim} ${seconds}s linear infinite">
    <span style="padding:0 24px;font-weight:700;font-size:14px;color:#111">${text}</span>
    <span style="padding:0 24px;font-weight:700;font-size:14px;color:#111">${text}</span>
    <span style="padding:0 24px;font-weight:700;font-size:14px;color:#111">${text}</span>
    <span style="padding:0 24px;font-weight:700;font-size:14px;color:#111">${text}</span>
  </div>
</div>`;
    }

    case "RetroGridComponent": {
      const pp = p as Record<string, unknown>;
      const h = Number(pp.height ?? 220);
      return `<div class="lcms-retrogrid" style="height:${Math.max(120, Math.min(900, h))}px;margin:14px 0"></div>`;
    }

    case "FlickeringGridComponent": {
      const pp = p as Record<string, unknown>;
      const h = Number(pp.height ?? 220);
      return `<div class="lcms-flickergrid" style="height:${Math.max(120, Math.min(900, h))}px;margin:14px 0"></div>`;
    }

    case "CircularGalleryComponent": {
      const pp = p as Record<string, unknown>;
      const h = Number(pp.height ?? 400);
      const rawItems = (pp.items as { image: string; text: string }[] | undefined) ?? [];
      const galleryItems = rawItems.length > 0 ? rawItems : [
        { image: "https://picsum.photos/seed/11/800/520", text: "Gallery" },
        { image: "https://picsum.photos/seed/22/800/520", text: "Explore" },
        { image: "https://picsum.photos/seed/33/800/520", text: "Discover" },
        { image: "https://picsum.photos/seed/44/800/520", text: "Create" },
        { image: "https://picsum.photos/seed/55/800/520", text: "Inspire" },
      ];
      const cgUid = `cg${Math.random().toString(36).slice(2, 8)}`;
      const cardH = Math.round(h * 0.78);
      const cardW = Math.round(cardH * 1.5);
      const cards = galleryItems.map((item) =>
        `<div style="flex:0 0 ${cardW}px;height:${cardH}px;border-radius:16px;overflow:hidden;position:relative;background:#27272a;flex-shrink:0;">` +
        `<img src="${item.image}" alt="${esc(item.text)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">` +
        `<div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;background:linear-gradient(to top,rgba(0,0,0,0.75),transparent);color:#fff;font-size:15px;font-weight:600;">${esc(item.text)}</div>` +
        `</div>`
      ).join("");
      return `<div style="height:${h}px;position:relative;border-radius:20px;overflow:hidden;background:#09090b;margin:14px 0;">
<div id="${cgUid}" style="display:flex;gap:16px;height:100%;padding:24px;overflow-x:auto;cursor:grab;user-select:none;scrollbar-width:none;-ms-overflow-style:none;align-items:center;">${cards}</div>
<script>(function(){var el=document.getElementById('${cgUid}');if(!el)return;var isD=false,sx=0,sl=0;el.addEventListener('mousedown',function(e){isD=true;el.style.cursor='grabbing';sx=e.pageX-el.offsetLeft;sl=el.scrollLeft;e.preventDefault();});document.addEventListener('mouseup',function(){isD=false;if(el)el.style.cursor='grab';});el.addEventListener('mousemove',function(e){if(!isD)return;e.preventDefault();el.scrollLeft=sl-(e.pageX-el.offsetLeft-sx)*1.5;});el.addEventListener('wheel',function(e){e.preventDefault();el.scrollLeft+=e.deltaY*0.8;},{passive:false});})();<\/script>
</div>`;
    }

    case "PixelCardComponent": {
      const pp = p as Record<string, unknown>;
      const h = Number(pp.height ?? 300);
      const variant = String(pp.variant ?? "default");
      const PCVARS: Record<string, { colors: string; gap: number; speed: number; border: string }> = {
        default: { colors: "#f8fafc,#f1f5f9,#cbd5e1", gap: 5, speed: 35, border: "#27272a" },
        blue:    { colors: "#e0f2fe,#7dd3fc,#0ea5e9", gap: 10, speed: 25, border: "#0ea5e9" },
        yellow:  { colors: "#fef08a,#fde047,#eab308", gap: 3,  speed: 20, border: "#eab308" },
        pink:    { colors: "#fecdd3,#fda4af,#e11d48", gap: 6,  speed: 80, border: "#e11d48" },
      };
      const pcCfg = PCVARS[variant] ?? PCVARS.default;
      const pcUid = `pc${Math.random().toString(36).slice(2, 8)}`;
      const pcColorsJSON = JSON.stringify(pcCfg.colors.split(","));
      const pcScript = `(function(){var ctn=document.getElementById('${pcUid}');var cv=document.getElementById('${pcUid}-cv');if(!ctn||!cv)return;var cols=${pcColorsJSON},gap=${pcCfg.gap},spd=${pcCfg.speed}*0.001,px=[],aid=null,ctx=null;function Px(x,y,c,d){this.x=x;this.y=y;this.color=c;this.sp=(Math.random()*0.8+0.1)*spd;this.sz=0;this.ss=Math.random()*0.4;this.mn=0.5;this.mx=Math.random()*1.5+0.5;this.delay=d;this.cnt=0;this.cs=Math.random()*4+(cv.width+cv.height)*0.01;this.idle=false;this.rev=false;this.shim=false;}Px.prototype.draw=function(){var o=1-this.sz*0.5;ctx.fillStyle=this.color;ctx.fillRect(this.x+o,this.y+o,this.sz,this.sz);};Px.prototype.appear=function(){this.idle=false;if(this.cnt<=this.delay){this.cnt+=this.cs;return;}if(this.sz>=this.mx)this.shim=true;if(this.shim)this.shimmer();else this.sz+=this.ss;this.draw();};Px.prototype.disappear=function(){this.shim=false;this.cnt=0;if(this.sz<=0){this.idle=true;return;}this.sz-=0.1;this.draw();};Px.prototype.shimmer=function(){if(this.sz>=this.mx)this.rev=true;else if(this.sz<=this.mn)this.rev=false;if(this.rev)this.sz-=this.sp;else this.sz+=this.sp;};function init(){ctx=cv.getContext('2d');cv.width=ctn.offsetWidth;cv.height=ctn.offsetHeight;px=[];for(var x=0;x<cv.width;x+=gap){for(var y=0;y<cv.height;y+=gap){var c=cols[Math.floor(Math.random()*cols.length)];var dx=x-cv.width/2,dy=y-cv.height/2;px.push(new Px(x,y,c,Math.sqrt(dx*dx+dy*dy)));}};}function step(fn){ctx.clearRect(0,0,cv.width,cv.height);var done=true;for(var i=0;i<px.length;i++){px[i][fn]();if(!px[i].idle)done=false;}if(!done)aid=requestAnimationFrame(function(){step(fn);});}function go(fn){if(aid)cancelAnimationFrame(aid);aid=requestAnimationFrame(function(){step(fn);});}requestAnimationFrame(function(){init();ctn.addEventListener('mouseenter',function(){go('appear');});ctn.addEventListener('mouseleave',function(){go('disappear');});});})();`;
      return `<div id="${pcUid}" style="position:relative;height:${h}px;border-radius:24px;overflow:hidden;border:1px solid ${pcCfg.border};background:#09090b;margin:14px 0;display:grid;place-items:center;">
<canvas id="${pcUid}-cv" style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%;"></canvas>
<div style="position:relative;z-index:2;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:16px;">${children}</div>
<script>${pcScript}<\/script>
</div>`;
    }

    case "StepperComponent": {
      const pp = p as Record<string, unknown>;
      const s1Raw = String(pp.step1 ?? "步驟一");
      const s2Raw = String(pp.step2 ?? "步驟二");
      const s3Raw = String(pp.step3 ?? "步驟三");
      const s1c = String(pp.step1Content ?? "");
      const s2c = String(pp.step2Content ?? "");
      const s3c = String(pp.step3Content ?? "");
      const titleColor = String(pp.titleColor ?? "#111827");
      const contentColor = String(pp.contentColor ?? "#374151");
      const contentFW = pp.contentBold ? "700" : "400";
      const stUid = `st${Math.random().toString(36).slice(2, 8)}`;
      const stStepsJSON = JSON.stringify([
        { title: s1Raw, content: s1c },
        { title: s2Raw, content: s2c },
        { title: s3Raw, content: s3c },
      ]);
      const stScript = `(function(){var steps=${stStepsJSON};var uid='${stUid}';var cur=0;function render(){var t=document.getElementById(uid+'-t');var bd=document.getElementById(uid+'-bd');var s=document.getElementById(uid+'-s');if(t)t.textContent=steps[cur].title;if(bd){bd.textContent=steps[cur].content;bd.style.display=steps[cur].content?'block':'none';}if(s)s.textContent='\u6b65\u9a5f '+(cur+1)+' / '+steps.length;for(var i=0;i<steps.length;i++){var c=document.getElementById(uid+'-c'+i);if(!c)continue;if(i<cur){c.className='lcms-step-circle done';c.textContent='\\u2713';}else if(i===cur){c.className='lcms-step-circle';c.textContent=String(i+1);}else{c.className='lcms-step-circle inactive';c.textContent=String(i+1);}var l=document.getElementById(uid+'-l'+i);if(l)l.className=i<cur?'lcms-step-line done':'lcms-step-line';}var bk=document.getElementById(uid+'-bk');if(bk)bk.disabled=cur===0;var nx=document.getElementById(uid+'-nx');if(nx)nx.textContent=cur===steps.length-1?'\\u5b8c\\u6210 \\u2713':'\\u7e7c\\u7e8c \\u2192';}var bk=document.getElementById(uid+'-bk');var nx=document.getElementById(uid+'-nx');if(bk)bk.addEventListener('click',function(){if(cur>0){cur--;render();}});if(nx)nx.addEventListener('click',function(){if(cur<steps.length-1){cur++;render();}else{cur=0;render();}});render();})();`;
      return `<div class="lcms-stepper">
  <div class="lcms-stepper-head">
    <div class="lcms-step-circle" id="${stUid}-c0">1</div>
    <div class="lcms-step-line" id="${stUid}-l0"></div>
    <div class="lcms-step-circle inactive" id="${stUid}-c1">2</div>
    <div class="lcms-step-line" id="${stUid}-l1"></div>
    <div class="lcms-step-circle inactive" id="${stUid}-c2">3</div>
  </div>
  <div class="lcms-stepper-body">
    <h4 class="lcms-stepper-title" id="${stUid}-t" style="color:${titleColor}">${esc(s1Raw)}</h4>
    <p class="lcms-stepper-text" id="${stUid}-bd" style="color:${contentColor};font-weight:${contentFW};${s1c ? "" : "display:none"}">${esc(s1c)}</p>
    <p class="lcms-stepper-text" id="${stUid}-s" style="margin-top:8px;color:#9ca3af;font-size:11px;">步驟 1 / 3</p>
  </div>
  <div class="lcms-stepper-footer">
    <button class="lcms-stepper-btn" id="${stUid}-bk" disabled>上一步</button>
    <button class="lcms-stepper-btn" id="${stUid}-nx">繼續 →</button>
  </div>
</div>
<script>${stScript}<\/script>`;
    }

    case "DecryptedTextComponent": {
      const pp = p as Record<string, unknown>;
      const textRaw = String(pp.text ?? "Hover to decrypt");
      const fs = Number(pp.fontSize ?? 28);
      const color = String(pp.color ?? "#111111");
      const speed = Number(pp.speed ?? 50);
      const sequential = Boolean(pp.sequential ?? false);
      const dtUid = `dt${Math.random().toString(36).slice(2, 8)}`;
      // Escape for JS string literal
      const textJS = textRaw.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, "\\n");
      const dtScript = `(function(){var el=document.getElementById('${dtUid}');if(!el)return;var txt='${textJS}';var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';var spd=${speed};var seq=${sequential ? "true" : "false"};var busy=false;var tids=[];function r(){return chars[Math.floor(Math.random()*chars.length)];}function run(){if(busy)return;busy=true;tids.forEach(clearTimeout);tids=[];var disp=txt.split('');var done=[];var idxs=disp.map(function(_,i){return i;}).filter(function(i){return txt[i]!==' ';});el.textContent=disp.map(function(c){return c===' '?' ':r();}).join('');idxs.forEach(function(idx,ord){var delay=seq?ord*(spd*1.2):0;var t=setTimeout(function(){var cnt=0;var iv=setInterval(function(){cnt++;if(cnt>=10){clearInterval(iv);disp[idx]=txt[idx];done.push(idx);if(done.length>=idxs.length)busy=false;}else{disp[idx]=r();}el.textContent=disp.join('');},spd);},delay);tids.push(t);});}el.addEventListener('mouseenter',function(){busy=false;run();});var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)run();});},{threshold:0.3});obs.observe(el);})();`;
      return `<div id="${dtUid}" style="font-size:${fs}px;font-weight:700;color:${color};text-align:center;margin:12px 0;letter-spacing:-0.01em;font-family:monospace;min-height:1.2em;">${esc(textRaw)}</div>
<script>${dtScript}<\/script>`;
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

/**
 * 將 HTML 中的本地圖片路徑（/uploads/...）重寫為 GitHub Pages 的絕對路徑。
 *
 * 背景：
 *   本地開發時圖片路徑為 /uploads/year/month/file.webp（相對根目錄）。
 *   GitHub Pages 的根路徑是 /{repoName}/，所以圖片應改為 /{repoName}/uploads/...。
 *   若 repoName 為空字串，則保持原路徑不變（適用於根域名部署）。
 *
 * @param html     - 待處理的 HTML 字串（通常是完整的 htmlSnapshot）
 * @param repoName - GitHub 倉庫名稱，例如 "my-blog"
 * @returns        - 路徑已修正的 HTML 字串
 *
 * @example
 *   rewriteImagePathsForGitHubPages(html, "my-blog")
 *   // /uploads/2025/01/img.webp → /my-blog/uploads/2025/01/img.webp
 */
export function rewriteImagePathsForGitHubPages(
  html: string,
  repoName: string,
): string {
  if (!repoName || !html) return html;

  // 清理 repoName，去掉多餘的斜線
  const repo = repoName.replace(/^\/+|\/+$/g, "");
  if (!repo) return html;

  // 替換 src="/uploads/..." 和 srcset="/uploads/..."
  // 僅匹配以 /uploads/ 開頭的路徑（避免誤改已包含 repo 前綴的路徑）
  return html.replace(
    /(src|srcset)="(\/uploads\/)/g,
    `$1="/${repo}/uploads/`,
  );
}
