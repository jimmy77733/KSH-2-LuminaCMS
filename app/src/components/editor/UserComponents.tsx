"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { MorphingText } from "@/components/ui/MorphingText";

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

export const TextComponent: React.FC<TextProps> & { craft?: any } = (
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
    actions.setProp(id, (p: any) => Object.assign(p, patch));

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

export const ImageComponent: React.FC<ImageProps> & { craft?: any } = (
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

  const borderStyle: ImageBorderStyle = props.borderStyle ?? "ios-inset";
  const borderDef = IMAGE_BORDER_STYLES[borderStyle];

  useEffect(() => {
    if (!selected) {
      setShowPicker(false);
      return;
    }
    if (!showPicker) return;
    setLoadingMedia(true);
    fetch("/api/media")
      .then((r) => r.json())
      .then((data) => setMediaItems(data))
      .catch(() => {})
      .finally(() => setLoadingMedia(false));
  }, [selected, showPicker]);

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
          <button
            type="button"
            onClick={() => setShowPicker((prev) => !prev)}
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

export const Container: React.FC<ContainerProps> & { craft?: any } = (
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

// ===== MorphingTextComponent =====

type MorphingTextComponentProps = {
  texts: string;      // 以換行符分隔的文字列表，e.g. "Hello\nWorld\nCraft"
  fontSize: number;
  color: string;
  align?: "left" | "center" | "right";
};

export const MorphingTextComponent: React.FC<MorphingTextComponentProps> & {
  craft?: any;
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
