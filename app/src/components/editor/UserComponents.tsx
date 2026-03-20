"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { MorphingText } from "@/components/ui/MorphingText";
import EvilEye, { type EvilEyeProps } from "@/components/ui/EvilEye";
import CircularGallery, { type CircularGalleryProps } from "@/components/ui/CircularGallery";
import PixelCard, { type PixelCardProps } from "@/components/ui/PixelCard";
import Stepper, { Step } from "@/components/ui/Stepper";
import DecryptedText from "@/components/ui/DecryptedText";
import { Terminal } from "@/components/ui/terminalCSS";
import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/components/ui/Scrolltext";
import { FlickeringGrid } from "@/lib/templates/flickeringGrid";
import { RetroGrid } from "@/lib/templates/RetroGrid";

// ─── NodeOverlay：選取外框 + 右上角紅叉刪除 ─────────────────────────────────
const NodeOverlay = ({
  nodeId,
  radius = "rounded",
}: {
  nodeId: string;
  radius?: string;
}) => {
  const { actions } = useEditor();

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 ${radius} ring-2 ring-sky-400/60`}
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          actions.delete(nodeId);
        }}
        className="absolute -right-2.5 -top-2.5 z-50 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold leading-none text-white shadow-lg transition hover:bg-red-600 active:scale-90"
        title="刪除元件"
      >
        ×
      </button>
    </>
  );
};

// ===== TextComponent =====

type TextPreset = "default" | "apple-hero" | "apple-subhead" | "tech-label";

type TextProps = {
  text: string;
  fontSize: number;
  color: string;
  weight: "normal" | "semibold" | "bold";
  preset?: TextPreset;
};

// 預設套用對應的 props 值（不儲存 preset 名稱本身，直接展開數值）
export const TEXT_PRESETS: Record<
  TextPreset,
  { label: string; props: Omit<TextProps, "text" | "preset"> }
> = {
  default: {
    label: "預設",
    props: { fontSize: 16, color: "#111111", weight: "normal" },
  },
  "apple-hero": {
    label: "Apple 大標",
    props: { fontSize: 48, color: "#111111", weight: "bold" },
  },
  "apple-subhead": {
    label: "Apple 副標",
    props: { fontSize: 20, color: "#6e6e73", weight: "normal" },
  },
  "tech-label": {
    label: "科技標籤",
    props: { fontSize: 12, color: "#0071e3", weight: "semibold" },
  },
};

export const TextComponent: React.FC<TextProps> & { craft?: unknown } = (
  props,
) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({
    selected: node.events.selected,
    id: node.id,
  }));

  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = () => {
    if (!editing) setEditing(true);
  };

  const handleBlur = useCallback(() => {
    if (!contentRef.current) return;
    const newText = contentRef.current.innerText;
    setProp((p: TextProps) => {
      p.text = newText;
    });
    setEditing(false);
  }, [setProp]);

  useEffect(() => {
    if (editing && contentRef.current) {
      contentRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, [editing]);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative block w-full"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: editing ? "text" : "default" }}
    >
      <div
        ref={contentRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className="outline-none"
        style={{
          fontSize: props.fontSize,
          color: props.color,
          fontWeight:
            props.weight === "bold"
              ? 700
              : props.weight === "semibold"
                ? 600
                : 400,
          minHeight: "1em",
          userSelect: editing ? "text" : "none",
        }}
      >
        {props.text}
      </div>
      {selected && !editing && <FloatingToolbar />}
      {selected && <NodeOverlay nodeId={nodeId} radius="rounded" />}
    </div>
  );
};

TextComponent.craft = {
  displayName: "Text",
  props: {
    text: "雙擊編輯文字",
    fontSize: 16,
    color: "#111111",
    weight: "normal",
  },
};

// ─── 浮動格式工具列 ───────────────────────────────────────────────────────────
const FloatingToolbar: React.FC = () => {
  const { actions, selected } = useEditor((state) => {
    const sel = state.events.selected;
    const id =
      sel instanceof Set
        ? [...sel][0]
        : Array.isArray(sel)
          ? (sel as string[])[0]
          : undefined;
    return { selected: id ? state.nodes[id] : null };
  });

  if (!selected) return null;

  const id = selected.id;
  const props = selected.data.props as TextProps;

  const update = (patch: Partial<TextProps>) =>
    actions.setProp(id, (p: Record<string, unknown>) => {
      Object.assign(p, patch as unknown as Record<string, unknown>);
    });

  return (
    <div className="absolute -top-9 left-0 z-50 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] text-white shadow-xl backdrop-blur-sm">
      <button
        type="button"
        className={`rounded-full px-2 py-0.5 font-bold transition ${
          props.weight !== "normal" ? "bg-white text-black" : "hover:bg-white/10"
        }`}
        onClick={() =>
          update({
            weight:
              props.weight === "normal"
                ? "semibold"
                : props.weight === "semibold"
                  ? "bold"
                  : "normal",
          })
        }
        title="切換粗體"
      >
        B
      </button>
      <span className="mx-0.5 text-white/30">|</span>
      <button
        type="button"
        className="rounded-full px-2 py-0.5 hover:bg-white/10"
        onClick={() => update({ fontSize: props.fontSize + 2 })}
        title="放大"
      >
        A↑
      </button>
      <button
        type="button"
        className="rounded-full px-2 py-0.5 hover:bg-white/10"
        onClick={() => update({ fontSize: Math.max(10, props.fontSize - 2) })}
        title="縮小"
      >
        A↓
      </button>
      <span className="mx-0.5 text-white/30">|</span>
      {(["#111111", "#0071e3", "#e3006b"] as const).map((c) => (
        <button
          key={c}
          type="button"
          className="h-4 w-4 rounded-full ring-2 ring-white/50 transition hover:scale-110"
          style={{ background: c }}
          onClick={() => update({ color: c })}
          title={c}
        />
      ))}
    </div>
  );
};

// ===== ImageComponent =====

type ImageBorderStyle = "none" | "ios-inset" | "floating";

type ImageProps = {
  src: string;
  alt: string;
  large?: string;
  small?: string;
  thumb?: string;
  borderStyle?: ImageBorderStyle;
};

type MediaPickerItem = {
  id: string;
  originalName: string;
  altText: string | null;
  paths: { large: string; small: string; thumb: string };
};

const IMAGE_BORDER_STYLES: Record<
  ImageBorderStyle,
  { label: string; wrapClass: string; innerClass: string }
> = {
  none: {
    label: "無邊框",
    wrapClass: "overflow-visible",
    innerClass: "overflow-hidden rounded-none",
  },
  "ios-inset": {
    label: "iOS 內縮",
    wrapClass: "overflow-visible rounded-2xl ring-1 ring-black/8 bg-white p-1",
    innerClass: "overflow-hidden rounded-xl",
  },
  floating: {
    label: "浮動陰影",
    wrapClass: "overflow-visible rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
    innerClass: "overflow-hidden rounded-2xl",
  },
};

export const ImageComponent: React.FC<ImageProps> & { craft?: unknown } = (
  props,
) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const [showPicker, setShowPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaPickerItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const borderStyle: ImageBorderStyle = props.borderStyle ?? "ios-inset";
  const borderDef = IMAGE_BORDER_STYLES[borderStyle];

  const togglePicker = async () => {
    if (!selected) return;
    if (showPicker) {
      setShowPicker(false);
      return;
    }
    setShowPicker(true);
    // 只在第一次開啟時抓取清單（避免每次點開都打 API）
    if (mediaItems.length > 0) return;
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/media");
      const data = (await res.json()) as MediaPickerItem[];
      setMediaItems(data);
    } catch {
      // ignore
    } finally {
      setLoadingMedia(false);
    }
  };

  const applyMedia = (item: MediaPickerItem) => {
    setProp((p: ImageProps) => {
      p.src = item.paths.large || item.paths.small || item.paths.thumb;
      p.alt = item.altText ?? item.originalName;
      p.large = item.paths.large;
      p.small = item.paths.small;
      p.thumb = item.paths.thumb;
    });
    setShowPicker(false);
  };

  const handleDirectUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", files[0]);
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("上傳失敗");
      const data = (await res.json()) as MediaPickerItem;
      applyMedia(data);
      // 同步媒體庫列表（如果已開啟過則重置，下次開啟時重新載入）
      setMediaItems([]);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const displaySrc =
    props.large || props.small || props.thumb || props.src || null;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative my-4 bg-zinc-100 ${borderDef.wrapClass}`}
    >
      <div className={borderDef.innerClass}>
        {displaySrc ? (
          <picture>
            {props.small && (
              <source
                srcSet={props.small}
                media="(max-width: 640px)"
                type="image/webp"
              />
            )}
            {props.large && (
              <source srcSet={props.large} type="image/webp" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt={props.alt || ""}
              className="h-auto w-full object-cover"
            />
          </picture>
        ) : (
          <div className="flex h-32 w-full items-center justify-center text-sm text-zinc-400">
            尚未選擇圖片
          </div>
        )}
      </div>

      {selected && (
        <>
          <NodeOverlay nodeId={nodeId} radius="rounded-2xl" />
          {/* 邊框樣式切換 */}
          <div className="absolute -top-9 left-0 z-50 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] text-white shadow-xl backdrop-blur-sm">
            {(Object.entries(IMAGE_BORDER_STYLES) as [ImageBorderStyle, (typeof IMAGE_BORDER_STYLES)[ImageBorderStyle]][]).map(([key, def]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProp((p: ImageProps) => { p.borderStyle = key; })}
                className={`rounded-full px-2 py-0.5 transition ${
                  borderStyle === key ? "bg-white text-black" : "hover:bg-white/10"
                }`}
              >
                {def.label}
              </button>
            ))}
          </div>
          {/* 直接上傳按鈕 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { void handleDirectUpload(e.target.files); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-28 z-10 rounded-full bg-emerald-600/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm hover:bg-emerald-600"
            disabled={uploading}
          >
            {uploading ? "上傳中…" : "直接上傳"}
          </button>
          <button
            type="button"
            onClick={() => { void togglePicker(); }}
            className="absolute bottom-2 right-2 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/90"
          >
            {showPicker ? "關閉媒體庫" : "選擇圖片"}
          </button>
        </>
      )}

      {/* 媒體庫選圖面板 */}
      {selected && showPicker && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur-xl ring-1 ring-black/5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 transparent" }}
        >
          {loadingMedia ? (
            <p className="py-4 text-center text-xs text-zinc-500">載入中…</p>
          ) : mediaItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">
              尚未上傳任何圖片。
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="overflow-hidden rounded-xl ring-2 ring-transparent transition hover:ring-sky-400"
                  onClick={() => applyMedia(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.paths.thumb}
                    alt={item.altText ?? item.originalName}
                    className="aspect-square h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ImageComponent.craft = {
  displayName: "Image",
  props: { src: "", alt: "", borderStyle: "ios-inset" },
};

// ===== Container =====

type ContainerVariant = "default" | "glass" | "tech" | "dark";

type ContainerProps = {
  padding: number;
  variant?: ContainerVariant;
  children?: React.ReactNode;
};

export const CONTAINER_PRESETS: Record<
  ContainerVariant,
  { label: string; className: string }
> = {
  default: {
    label: "白色卡片",
    className: "relative w-full rounded-[24px] bg-white shadow-sm ring-1 ring-black/5",
  },
  glass: {
    label: "毛玻璃",
    className: "relative w-full rounded-[24px] bg-white/60 shadow-lg ring-1 ring-white/60 backdrop-blur-xl",
  },
  tech: {
    label: "科技感",
    className: "relative w-full rounded-[24px] bg-zinc-950 shadow-[0_0_0_1px_rgba(0,113,227,0.4),0_8px_32px_rgba(0,113,227,0.15)]",
  },
  dark: {
    label: "深色卡片",
    className: "relative w-full rounded-[24px] bg-zinc-900 shadow-xl ring-1 ring-white/8",
  },
};

export const Container: React.FC<ContainerProps> & { craft?: unknown } = (
  props,
) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const variant: ContainerVariant = props.variant ?? "default";
  const preset = CONTAINER_PRESETS[variant];

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={preset.className}
      style={{ padding: props.padding }}
    >
      {props.children}

      {/* 卡片樣式切換浮動列 */}
      {selected && (
        <div className="absolute -top-9 left-0 z-50 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] text-white shadow-xl backdrop-blur-sm">
          {(Object.entries(CONTAINER_PRESETS) as [ContainerVariant, typeof CONTAINER_PRESETS[ContainerVariant]][]).map(([key, def]) => (
            <button
              key={key}
              type="button"
              onClick={() => setProp((p: ContainerProps) => { p.variant = key; })}
              className={`rounded-full px-2 py-0.5 transition ${
                variant === key ? "bg-white text-black font-semibold" : "hover:bg-white/10"
              }`}
            >
              {def.label}
            </button>
          ))}
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-[24px]" />}
    </div>
  );
};

Container.craft = {
  displayName: "Container",
  props: { padding: 24, variant: "default" },
  isCanvas: true,
  rules: {
    canMoveIn: () => true,
  },
};

// ===== EvilEyeContainer =====
type EvilEyeContainerProps = EvilEyeProps & {
  padding: number;
  height: number;
  children?: React.ReactNode;
};

export const EvilEyeContainer: React.FC<EvilEyeContainerProps> & {
  craft?: unknown;
} = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const { padding, height, children, ...evilProps } = props;
  const safeHeight = Number.isFinite(height) ? height : 280;

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="relative w-full overflow-hidden rounded-[24px] bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur"
      style={{ padding, minHeight: safeHeight }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
        <EvilEye {...evilProps} />
      </div>

      {selected && (
        <div className="absolute left-3 top-3 z-20 rounded-xl bg-black/80 px-3 py-2 text-[11px] text-white shadow ring-1 ring-white/20 backdrop-blur flex flex-col gap-2 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">高度</span>
            <input
              type="number" min={120} max={800}
              className="w-20 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white"
              value={safeHeight}
              onChange={(e) => setProp((p: EvilEyeContainerProps) => { p.height = Number(e.target.value || 280); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">眼色</span>
            <input
              type="color"
              className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent"
              value={String(evilProps.eyeColor ?? "#ff6a00")}
              onChange={(e) => setProp((p: EvilEyeContainerProps) => { p.eyeColor = e.target.value; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <span className="font-mono text-white/60">{String(evilProps.eyeColor ?? "#ff6a00")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">背景</span>
            <input
              type="color"
              className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent"
              value={String(evilProps.backgroundColor ?? "#000000")}
              onChange={(e) => setProp((p: EvilEyeContainerProps) => { p.backgroundColor = e.target.value; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <span className="font-mono text-white/60">{String(evilProps.backgroundColor ?? "#000000")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">內距</span>
            <input
              type="number" min={0} max={80}
              className="w-20 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white"
              value={padding}
              onChange={(e) => setProp((p: EvilEyeContainerProps) => { p.padding = Number(e.target.value || 0); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="relative z-10">{children}</div>

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-[24px]" />}
    </div>
  );
};

EvilEyeContainer.craft = {
  displayName: "EvilEyeContainer",
  props: { padding: 24, height: 280, eyeColor: "#ff6a00", backgroundColor: "#000000" },
  isCanvas: true,
  rules: {
    canMoveIn: () => true,
  },
};

// ===== MorphingTextComponent =====

type MorphingTextComponentProps = {
  texts: string;      // 以換行符分隔的文字列表，e.g. "Hello\nWorld\nCraft"
  fontSize: number;
  color: string;
  align?: "left" | "center" | "right";
};

export const MorphingTextComponent: React.FC<MorphingTextComponentProps> & {
  craft?: unknown;
} = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const textsArray = props.texts
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  const displayTexts = textsArray.length >= 2 ? textsArray : ["請輸入", "至少兩行文字"];

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative my-4 w-full"
    >
      {selected ? (
        /* ── 編輯模式：顯示 textarea ── */
        <div className="rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-500">
            MorphingText 編輯模式 — 每行一個文字
          </p>
          <textarea
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            rows={Math.max(3, textsArray.length + 1)}
            value={props.texts}
            onChange={(e) =>
              setProp((p: MorphingTextComponentProps) => {
                p.texts = e.target.value;
              })
            }
            placeholder={"文字一\n文字二\n文字三"}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[11px] text-zinc-500">對齊：</label>
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setProp((p: MorphingTextComponentProps) => { p.align = a; })}
                className={`rounded px-2 py-0.5 text-xs transition ${
                  (props.align ?? "center") === a
                    ? "bg-sky-500 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {a === "left" ? "左" : a === "center" ? "中" : "右"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-sky-400">
            ✦ 點擊畫布空白處即可預覽變形動畫效果
          </p>
        </div>
      ) : (
        /* ── 預覽模式：渲染 MorphingText 動畫（點擊元件可進入編輯）── */
        <MorphingText
          texts={displayTexts}
          fontSize={props.fontSize}
          color={props.color}
          className="mx-0"
        />
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-2xl" />}
    </div>
  );
};

MorphingTextComponent.craft = {
  displayName: "MorphingText",
  props: {
    texts: "LuminaCMS\n創意無限\n自由排版",
    fontSize: 40,
    color: "#111111",
    align: "center",
  },
};

// ===== TerminalComponent =====

type TerminalComponentProps = {
  lines: string; // 每行一筆（換行分隔）
};

export const TerminalComponent: React.FC<TerminalComponentProps> & {
  craft?: unknown;
} = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const lines = String(props.lines ?? "")
    .split("\n")
    .map((t) => t.replace(/\r/g, ""))
    .filter((t) => t.length > 0);

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative my-4 w-full"
    >
      {selected ? (
        <div className="rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-500">
            Terminal 編輯模式 — 每行一個指令/輸出
          </p>
          <textarea
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            rows={Math.max(4, lines.length + 1)}
            value={props.lines}
            onChange={(e) =>
              setProp((p: TerminalComponentProps) => {
                p.lines = e.target.value;
              })
            }
            placeholder={"npm install\nnpm run dev\n..."}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <p className="mt-2 text-[10px] text-sky-400">
            ✦ 點擊畫布空白處即可回到預覽效果
          </p>
        </div>
      ) : (
        <Terminal sequence={false} className="mx-auto">
          {lines.map((line, i) => (
            <div key={i} className="text-zinc-700">
              {line}
            </div>
          ))}
        </Terminal>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-2xl" />}
    </div>
  );
};

TerminalComponent.craft = {
  displayName: "Terminal",
  props: {
    lines: "$ npm install\n$ npm run dev\nServer ready on http://localhost:3000",
  },
};

// ===== ScrolltextComponent =====

type ScrolltextComponentProps = {
  text: string;
  baseVelocity: number; // 0~20 建議
  direction: 1 | -1;
};

export const ScrolltextComponent: React.FC<ScrolltextComponentProps> & {
  craft?: unknown;
} = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const text = String(props.text ?? "LuminaCMS · Scrolltext");
  const baseVelocity = Number.isFinite(props.baseVelocity)
    ? props.baseVelocity
    : 6;
  const direction = props.direction === -1 ? -1 : 1;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative my-4 w-full overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
    >
      {selected && (
        <div className="mb-3 grid gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="grid gap-1">
            <label className="text-[11px] font-semibold text-sky-700">
              文字
            </label>
            <input
              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              value={text}
              onChange={(e) =>
                setProp((p: ScrolltextComponentProps) => {
                  p.text = e.target.value;
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <label className="text-[11px] font-semibold text-sky-700">
                速度
              </label>
              <input
                type="number"
                min={0}
                max={20}
                step={1}
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                value={baseVelocity}
                onChange={(e) =>
                  setProp((p: ScrolltextComponentProps) => {
                    p.baseVelocity = Number(e.target.value || 0);
                  })
                }
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[11px] font-semibold text-sky-700">
                方向
              </label>
              <div className="flex gap-1">
                {([1, -1] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition ${
                      direction === d
                        ? "bg-sky-500 text-white"
                        : "bg-white text-zinc-600 ring-1 ring-black/10 hover:bg-zinc-50"
                    }`}
                    onClick={() =>
                      setProp((p: ScrolltextComponentProps) => {
                        p.direction = d;
                      })
                    }
                  >
                    {d === 1 ? "→" : "←"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ScrollVelocityContainer>
        <ScrollVelocityRow
          baseVelocity={Math.max(0, baseVelocity)}
          direction={direction}
          className="py-1"
        >
          <span className="px-6 text-sm font-semibold text-zinc-900">
            {text}
          </span>
        </ScrollVelocityRow>
      </ScrollVelocityContainer>

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-2xl" />}
    </div>
  );
};

ScrolltextComponent.craft = {
  displayName: "Scrolltext",
  props: { text: "LuminaCMS · Scrolltext · CSS FX", baseVelocity: 6, direction: 1 },
};

// ===== Background FX Components (RetroGrid / FlickeringGrid / Ripple) =====

type FxBoxProps = {
  height: number;
};

export const RetroGridComponent: React.FC<FxBoxProps> & { craft?: unknown } = (
  props,
) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const height = Number.isFinite(props.height) ? props.height : 220;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative my-4 w-full overflow-hidden rounded-3xl bg-zinc-950 ring-1 ring-white/10"
      style={{ height }}
    >
      <RetroGrid opacity={0.45} lightLineColor="rgba(0,0,0,0.25)" darkLineColor="rgba(255,255,255,0.22)" />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-sm font-semibold text-white/90">RetroGrid</p>
      </div>

      {selected && (
        <div className="absolute left-3 top-3 z-20 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="font-semibold">高度</span>
            <input
              type="number"
              min={120}
              max={640}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={height}
              onChange={(e) =>
                setProp((p: FxBoxProps) => {
                  p.height = Number(e.target.value || 220);
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-3xl" />}
    </div>
  );
};

RetroGridComponent.craft = {
  displayName: "RetroGrid",
  props: { height: 220 },
};

export const FlickeringGridComponent: React.FC<FxBoxProps> & { craft?: unknown } = (
  props,
) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const height = Number.isFinite(props.height) ? props.height : 220;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className="relative my-4 w-full overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
      style={{ height }}
    >
      <FlickeringGrid className="absolute inset-0" maxOpacity={0.22} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-sm font-semibold text-zinc-800">FlickeringGrid</p>
      </div>

      {selected && (
        <div className="absolute left-3 top-3 z-20 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="font-semibold">高度</span>
            <input
              type="number"
              min={120}
              max={640}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={height}
              onChange={(e) =>
                setProp((p: FxBoxProps) => {
                  p.height = Number(e.target.value || 220);
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-3xl" />}
    </div>
  );
};

FlickeringGridComponent.craft = {
  displayName: "FlickeringGrid",
  props: { height: 220 },
};

// ===== CircularGalleryComponent =====

type CircularGalleryComponentProps = CircularGalleryProps & {
  height?: number;
};

export const CircularGalleryComponent: React.FC<CircularGalleryComponentProps> & { craft?: unknown } = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const [showPicker, setShowPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaPickerItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const { height, ...galleryProps } = props;
  const safeHeight = Number.isFinite(height) ? (height as number) : 400;
  const safeItems = galleryProps.items ?? [];

  const openPicker = async () => {
    setShowPicker(true);
    if (mediaItems.length > 0) return;
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/media");
      const data = (await res.json()) as MediaPickerItem[];
      setMediaItems(data);
    } catch {
      // ignore
    } finally {
      setLoadingMedia(false);
    }
  };

  const addGalleryItem = (item: MediaPickerItem) => {
    const url = item.paths.large || item.paths.small || item.paths.thumb;
    setProp((p: CircularGalleryComponentProps) => {
      p.items = [...(p.items ?? []), { image: url, text: item.altText ?? item.originalName }];
    });
    setShowPicker(false);
  };

  const removeGalleryItem = (index: number) => {
    setProp((p: CircularGalleryComponentProps) => {
      p.items = (p.items ?? []).filter((_, i) => i !== index);
    });
  };

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="relative my-4 w-full overflow-hidden rounded-3xl bg-zinc-950"
      style={{ height: safeHeight }}
    >
      <CircularGallery {...galleryProps} />

      {selected && (
        <div className="absolute left-3 top-3 z-20 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur flex flex-col gap-2 max-h-72 overflow-y-auto" style={{ minWidth: 210 }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold">高度</span>
            <input
              type="number" min={200} max={800}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={safeHeight}
              onChange={(e) => setProp((p: CircularGalleryComponentProps) => { p.height = Number(e.target.value || 400); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">彎曲</span>
            <input
              type="number" min={0} max={10} step={0.5}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={galleryProps.bend ?? 3}
              onChange={(e) => setProp((p: CircularGalleryComponentProps) => { p.bend = Number(e.target.value); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          {/* 圖片管理 */}
          <div className="border-t border-zinc-100 pt-2">
            <div className="font-semibold mb-1">圖片 ({safeItems.length})</div>
            {safeItems.length > 0 && (
              <div className="flex flex-col gap-1 mb-1 max-h-28 overflow-y-auto">
                {safeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.text} className="w-8 h-5 rounded object-cover flex-shrink-0" />
                    <span className="flex-1 truncate text-[10px]">{item.text}</span>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-600 text-[10px] flex-shrink-0 px-1"
                      onClick={() => removeGalleryItem(idx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="w-full rounded-md bg-sky-500 px-2 py-1 text-white text-[10px] hover:bg-sky-600 transition"
              onClick={() => { void openPicker(); }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              + 從媒體庫新增
            </button>
          </div>
        </div>
      )}

      {/* 媒體庫選圖面板 */}
      {selected && showPicker && (
        <div
          className="absolute left-3 right-3 bottom-3 z-30 max-h-64 overflow-y-auto rounded-2xl bg-white/98 p-3 shadow-xl backdrop-blur-xl ring-1 ring-black/5"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-700">選擇圖片加入 Gallery</span>
            <button type="button" className="text-xs text-zinc-400 hover:text-zinc-600" onClick={() => setShowPicker(false)}>關閉</button>
          </div>
          {loadingMedia ? (
            <p className="py-4 text-center text-xs text-zinc-500">載入中…</p>
          ) : mediaItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">尚未上傳任何圖片。</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="overflow-hidden rounded-xl ring-2 ring-transparent transition hover:ring-sky-400"
                  onClick={() => addGalleryItem(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.paths.thumb} alt={item.altText ?? item.originalName} className="aspect-square h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-3xl" />}
    </div>
  );
};

CircularGalleryComponent.craft = {
  displayName: "CircularGallery",
  props: {
    height: 400, bend: 3, textColor: "#ffffff", borderRadius: 0.05,
    items: [
      { image: "https://picsum.photos/seed/11/800/520", text: "Gallery" },
      { image: "https://picsum.photos/seed/22/800/520", text: "Explore" },
      { image: "https://picsum.photos/seed/33/800/520", text: "Discover" },
      { image: "https://picsum.photos/seed/44/800/520", text: "Create" },
    ],
  },
};

// ===== PixelCardComponent =====

type PixelCardComponentProps = PixelCardProps & {
  height?: number;
  children?: React.ReactNode;
};

export const PixelCardComponent: React.FC<PixelCardComponentProps> & { craft?: unknown } = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const { height, children, ...cardProps } = props;
  const safeHeight = Number.isFinite(height) ? (height as number) : 300;

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="relative my-4 inline-block w-full"
    >
      <div style={{ height: safeHeight, width: "100%", borderRadius: "24px", overflow: "hidden" }}>
        <PixelCard {...cardProps} className="w-full h-full" style={{ height: "100%", width: "100%", borderRadius: "24px" }}>
          <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
            {children}
          </div>
        </PixelCard>
      </div>

      {selected && (
        <div className="absolute left-3 top-3 z-20 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">高度</span>
            <input
              type="number" min={120} max={800}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={safeHeight}
              onChange={(e) => setProp((p: PixelCardComponentProps) => { p.height = Number(e.target.value || 300); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">變體</span>
            <select
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={cardProps.variant ?? "default"}
              onChange={(e) => setProp((p: PixelCardComponentProps) => { p.variant = e.target.value as PixelCardProps["variant"]; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {(["default", "blue", "yellow", "pink"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-3xl" />}
    </div>
  );
};

PixelCardComponent.craft = {
  displayName: "PixelCard",
  props: { height: 300, variant: "default" },
  isCanvas: true,
  rules: { canMoveIn: () => true },
};

// ===== StepperComponent =====

type StepperComponentProps = {
  accentColor?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  step1Content?: string;
  step2Content?: string;
  step3Content?: string;
  titleColor?: string;
  contentColor?: string;
  contentBold?: boolean;
};

const STEP_KEYS = [
  { titleKey: "step1" as const, contentKey: "step1Content" as const, label: "步驟 1" },
  { titleKey: "step2" as const, contentKey: "step2Content" as const, label: "步驟 2" },
  { titleKey: "step3" as const, contentKey: "step3Content" as const, label: "步驟 3" },
];

export const StepperComponent: React.FC<StepperComponentProps> & { craft?: unknown } = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const {
    step1 = "步驟一", step2 = "步驟二", step3 = "步驟三",
    step1Content = "", step2Content = "", step3Content = "",
    titleColor = "#111827",
    contentColor = "#374151",
    contentBold = false,
  } = props;

  const steps = [
    { title: step1, content: step1Content },
    { title: step2, content: step2Content },
    { title: step3, content: step3Content },
  ];

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="relative my-4 w-full"
    >
      <Stepper initialStep={1} backButtonText="上一步" nextButtonText="下一步">
        {steps.map((s, i) => (
          <Step key={i}>
            <h2 className="mb-2 text-lg font-bold" style={{ color: titleColor }}>{s.title}</h2>
            {s.content && (
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ color: contentColor, fontWeight: contentBold ? 700 : 400 }}
              >{s.content}</p>
            )}
          </Step>
        ))}
      </Stepper>

      {selected && (
        <div
          className="absolute left-3 top-3 z-20 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur flex flex-col gap-3"
          style={{ minWidth: 256, maxHeight: 420, overflowY: "auto" }}
        >
          {/* 全域樣式 */}
          <div className="flex flex-col gap-1.5 border-b border-zinc-100 pb-2">
            <span className="font-semibold text-zinc-800 text-[11px]">全域樣式</span>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-zinc-500">標題顏色</span>
              <input
                type="color"
                className="h-6 w-10 cursor-pointer rounded border border-zinc-200 p-0.5"
                value={titleColor}
                onChange={(e) => setProp((p: StepperComponentProps) => { p.titleColor = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-mono"
                value={titleColor}
                onChange={(e) => setProp((p: StepperComponentProps) => { p.titleColor = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-zinc-500">內文顏色</span>
              <input
                type="color"
                className="h-6 w-10 cursor-pointer rounded border border-zinc-200 p-0.5"
                value={contentColor}
                onChange={(e) => setProp((p: StepperComponentProps) => { p.contentColor = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-mono"
                value={contentColor}
                onChange={(e) => setProp((p: StepperComponentProps) => { p.contentColor = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-zinc-500">內文粗體</span>
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${contentBold ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
                onClick={() => setProp((p: StepperComponentProps) => { p.contentBold = !p.contentBold; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                B
              </button>
              <span className="text-zinc-400">{contentBold ? "已開啟" : "關閉"}</span>
            </div>
          </div>

          {/* 各步驟文字 */}
          {STEP_KEYS.map(({ titleKey, contentKey, label }) => (
            <div key={titleKey} className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">{label}</span>
              <input
                type="text"
                placeholder="標題"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
                value={props[titleKey] ?? ""}
                onChange={(e) => setProp((p: StepperComponentProps) => { p[titleKey] = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <textarea
                placeholder="內文（可留空）"
                rows={2}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] resize-none"
                value={props[contentKey] ?? ""}
                onChange={(e) => setProp((p: StepperComponentProps) => { p[contentKey] = e.target.value; })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-2xl" />}
    </div>
  );
};

StepperComponent.craft = {
  displayName: "Stepper",
  props: {
    step1: "步驟一", step2: "步驟二", step3: "步驟三",
    step1Content: "", step2Content: "", step3Content: "",
    titleColor: "#111827", contentColor: "#374151", contentBold: false,
  },
};

// ===== DecryptedTextComponent =====

type DecryptedTextComponentProps = {
  text?: string;
  speed?: number;
  animateOn?: "hover" | "view" | "click";
  fontSize?: number;
  color?: string;
  encryptedColor?: string;
};

export const DecryptedTextComponent: React.FC<DecryptedTextComponentProps> & { craft?: unknown } = (props) => {
  const {
    id: nodeId,
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, id: node.id }));

  const { text = "Hover to decrypt", speed = 50, animateOn = "hover", fontSize = 28, color = "#111111", encryptedColor = "#0071e3" } = props;

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)); }}
      className="relative my-3 w-full text-center"
      style={{ fontSize, color, fontWeight: 700 }}
    >
      <DecryptedText
        text={text}
        speed={speed}
        animateOn={animateOn}
        className="decrypted-revealed"
        encryptedClassName="decrypted-encrypted"
        sequential
        revealDirection="start"
      />

      {selected && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-xl bg-white/90 px-3 py-2 text-[11px] text-zinc-700 shadow ring-1 ring-black/10 backdrop-blur flex flex-col gap-2 min-w-[220px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">文字</span>
            <input
              type="text"
              className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={text}
              onChange={(e) => setProp((p: DecryptedTextComponentProps) => { p.text = e.target.value; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">字體大小</span>
            <input
              type="number" min={12} max={120}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={fontSize}
              onChange={(e) => setProp((p: DecryptedTextComponentProps) => { p.fontSize = Number(e.target.value || 28); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">顏色</span>
            <input
              type="color"
              className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent"
              value={color}
              onChange={(e) => setProp((p: DecryptedTextComponentProps) => { p.color = e.target.value; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">觸發</span>
            <select
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={animateOn}
              onChange={(e) => setProp((p: DecryptedTextComponentProps) => { p.animateOn = e.target.value as "hover" | "view" | "click"; })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <option value="hover">滑鼠懸停</option>
              <option value="view">進入視野</option>
              <option value="click">點擊</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-16 shrink-0">速度</span>
            <input
              type="number" min={10} max={300}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px]"
              value={speed}
              onChange={(e) => setProp((p: DecryptedTextComponentProps) => { p.speed = Number(e.target.value || 50); })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {selected && <NodeOverlay nodeId={nodeId} radius="rounded-xl" />}
    </div>
  );
};

DecryptedTextComponent.craft = {
  displayName: "DecryptedText",
  props: { text: "Hover to decrypt", speed: 50, animateOn: "hover", fontSize: 28, color: "#111111", encryptedColor: "#0071e3" },
};

// ===== CanvasContainer（Root 畫布純容器）=====

export const CanvasContainer = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="min-h-[200px] w-full"
    >
      {children}
    </div>
  );
};

CanvasContainer.craft = { displayName: "Root Canvas" };
