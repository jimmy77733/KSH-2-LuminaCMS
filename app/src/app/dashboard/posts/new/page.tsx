"use client";

import React, { useEffect, useRef, useState } from "react";
import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import { useRouter } from "next/navigation";
import {
  CanvasContainer,
  Container,
  EvilEyeContainer,
  TextComponent,
  ImageComponent,
  MorphingTextComponent,
  TerminalComponent,
  ScrolltextComponent,
  RetroGridComponent,
  FlickeringGridComponent,
  CircularGalleryComponent,
  PixelCardComponent,
  StepperComponent,
  DecryptedTextComponent,
  TEXT_PRESETS,
  CONTAINER_PRESETS,
} from "@/components/editor/UserComponents";
import { getTemplateShell } from "@/lib/templates/default";
import { craftJsonToHtml } from "@/lib/craftToHtml";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TemplateItem = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  preview: string;
  cssContent: string;
  bgScript: string;
};

const PREVIEW_STORAGE_KEY = "lumina_temp_preview";

// ─── 初始畫布 ──────────────────────────────────────────────────────────────────
function EditorCanvas({
  queryRef,
}: {
  queryRef: React.MutableRefObject<(() => string) | null>;
}) {
  const { query } = useEditor();

  useEffect(() => {
    queryRef.current = () => query.serialize();
  }, [query, queryRef]);

  return (
    <Frame>
      <Element is={CanvasContainer} canvas>
        <Element is={Container} padding={24} canvas>
          <TextComponent text="新的 LuminaCMS 文章" fontSize={28} color="#111111" weight="bold" />
          <TextComponent text="在這裡開始撰寫你的內容…" fontSize={16} color="#6e6e73" weight="normal" />
        </Element>
      </Element>
    </Frame>
  );
}

// ─── 全域鍵盤處理 ──────────────────────────────────────────────────────────────
function KeyboardHandler() {
  const { actions, selectedId } = useEditor((state) => {
    const sel = state.events.selected;
    const id = sel instanceof Set ? [...sel][0] : undefined;
    return { selectedId: id ?? null };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !isTyping) {
        e.preventDefault();
        try { actions.history.undo(); } catch { /* noop */ }
        return;
      }
      if (!isTyping && (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      )) {
        e.preventDefault();
        try { actions.history.redo(); } catch { /* noop */ }
        return;
      }
      if (!selectedId || isTyping) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        try { actions.delete(selectedId); } catch { /* noop */ }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, selectedId]);

  return null;
}

// ─── 頂部工具列內容（需在 Editor context 內使用 useEditor）───────────────────
function TopToolbarContent({
  templates,
  selectedTemplateId,
  onTemplateChange,
}: {
  templates: TemplateItem[];
  selectedTemplateId: string;
  onTemplateChange: (id: string) => void;
}) {
  const { actions, selectedNodeId } = useEditor((state) => {
    const sel = state.events.selected;
    const id = sel instanceof Set ? [...sel][0] : undefined;
    return { selectedNodeId: id ?? null };
  });

  const textPresetEntries = Object.entries(TEXT_PRESETS) as [string, typeof TEXT_PRESETS[keyof typeof TEXT_PRESETS]][];
  const containerPresetEntries = Object.entries(CONTAINER_PRESETS) as [string, typeof CONTAINER_PRESETS[keyof typeof CONTAINER_PRESETS]][];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {/* 模板選擇 */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">模板</span>
          <div className="flex flex-wrap gap-1">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTemplateChange(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  t.id === selectedTemplateId
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white text-zinc-600 ring-1 ring-black/8 hover:bg-zinc-50"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                  style={{ background: t.preview }}
                />
                {t.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-4 w-px shrink-0 bg-black/10" />

      {/* 文字樣式預設 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">文字</span>
        <div className="flex flex-wrap gap-1">
          {textPresetEntries.map(([key, def]) => (
            <button
              key={key}
              type="button"
              disabled={!selectedNodeId}
              onClick={() => {
                if (!selectedNodeId) return;
                actions.setProp(selectedNodeId, (p: Record<string, unknown>) => {
                  Object.assign(p, def.props as unknown as Record<string, unknown>);
                });
              }}
              className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-black/8 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px shrink-0 bg-black/10" />

      {/* 容器樣式預設 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">容器</span>
        <div className="flex flex-wrap gap-1">
          {containerPresetEntries.map(([key, def]) => (
            <button
              key={key}
              type="button"
              disabled={!selectedNodeId}
              onClick={() => {
                if (!selectedNodeId) return;
                actions.setProp(selectedNodeId, (p: { variant?: string }) => {
                  p.variant = key;
                });
              }}
              className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-black/8 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {!selectedNodeId && (
        <span className="text-[11px] italic text-zinc-400">選取元件後可套用樣式</span>
      )}
    </div>
  );
}

// ─── 側邊欄工具箱（僅保留元件工具箱 + 快捷鍵）────────────────────────────────
function SidebarToolset() {
  const { connectors } = useEditor();

  const items = [
    { label: "文字區塊", icon: "T", el: () => <TextComponent text="雙擊編輯文字" fontSize={16} color="#111111" weight="normal" /> },
    { label: "圖片區塊", icon: "⬜", el: () => <ImageComponent src="" alt="" borderStyle="ios-inset" /> },
    { label: "容器區塊", icon: "▭", el: () => <Container padding={24} variant="default" /> },
    { label: "邪眼背景（EvilEye）", icon: "👁", el: () => <EvilEyeContainer padding={24} height={280} eyeColor="#ff6a00" backgroundColor="#000000" /> },
    { label: "變形文字(Morphing)", icon: "✦", el: () => <MorphingTextComponent texts={"LuminaCMS\n創意無限\n自由排版"} fontSize={40} color="#111111" align="center" /> },
    { label: "終端機（Terminal）", icon: "⌘", el: () => <TerminalComponent lines={"$ npm install\n$ npm run dev\nReady"} /> },
    { label: "跑馬燈（Scrolltext）", icon: "≋", el: () => <ScrolltextComponent text="LuminaCMS · Scrolltext · CSS FX" baseVelocity={6} direction={1} /> },
    { label: "環形圖庫（Gallery）", icon: "🎠", el: () => <CircularGalleryComponent height={400} bend={3} /> },
    { label: "像素卡片（PixelCard）", icon: "✦", el: () => <PixelCardComponent height={260} variant="default" /> },
    { label: "步驟精靈（Stepper）", icon: "◎", el: () => <StepperComponent /> },
    { label: "解密文字（Decrypt）", icon: "🔐", el: () => <DecryptedTextComponent text="Hover to decrypt" fontSize={28} color="#111111" animateOn="hover" /> },
  ];

  return (
    <aside className="flex flex-col gap-2">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        元件工具箱
      </p>
      {items.map((item) => (
        <div
          key={item.label}
          ref={(ref) => { if (ref) connectors.create(ref, item.el()); }}
          className="flex cursor-grab select-none items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-black/5 transition active:scale-95 hover:bg-white hover:shadow-md"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-black/8">
            {item.icon}
          </span>
          {item.label}
        </div>
      ))}

      <div className="mt-2 rounded-2xl bg-sky-50 p-3 text-[11px] text-sky-700 ring-1 ring-sky-200/60">
        <p className="mb-1 font-semibold">快捷鍵</p>
        <ul className="space-y-0.5 text-sky-600">
          <li>⌘Z — 撤銷　⌘Y — 重做</li>
          <li>Del — 刪除選取</li>
          <li>雙擊文字 — 直接編輯</li>
        </ul>
      </div>
    </aside>
  );
}

// ─── 畫布內 Undo/Redo 工具列 ────────────────────────────────────────────────────
function CanvasToolbar() {
  const { actions, selectedName } = useEditor((state) => {
    const sel = state.events.selected;
    const id = sel instanceof Set ? [...sel][0] : undefined;
    return { selectedName: id ? (state.nodes[id]?.data?.name ?? null) : null };
  });

  return (
    <div className="mb-3 flex items-center gap-1 px-1">
      <button type="button"
        onClick={() => { try { actions.history.undo(); } catch { /* noop */ } }}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
        ↩ 撤銷
      </button>
      <button type="button"
        onClick={() => { try { actions.history.redo(); } catch { /* noop */ } }}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
        ↪ 重做
      </button>
      {selectedName && (
        <span className="ml-auto rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-sm">
          已選取：{selectedName}
        </span>
      )}
    </div>
  );
}

// ─── 頁面主體 ──────────────────────────────────────────────────────────────────
export default function NewPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("新的 LuminaCMS 文章");
  const serializeRef = useRef<(() => string) | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [toolbarOpen, setToolbarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        const list = data as TemplateItem[];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplateId) {
          const def = list.find((t) => t.name === "default") ?? list[0];
          setSelectedTemplateId(def.id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedTemplateCss = selectedTemplate?.cssContent ?? "";
  const selectedTemplateBgScript = selectedTemplate?.bgScript ?? "";

  const buildFullHtml = (json: string) => {
    const contentHtml = craftJsonToHtml(json) || "<p>（空白內容）</p>";
    return getTemplateShell(selectedTemplateCss || undefined, {
      bgScript: selectedTemplateBgScript || undefined,
    })
      .replace(/{{TITLE}}/g, title)
      .replace(/{{CONTENT}}/g, contentHtml)
      .replace(/{{DATE}}/g, new Date().toISOString().slice(0, 10));
  };

  const handlePreview = () => {
    const json = serializeRef.current?.() ?? "{}";
    const fullHtml = buildFullHtml(json);
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify({ html: fullHtml, title }));
    window.open("/dashboard/posts/preview/temp", "_blank");
  };

  const handleSaveDraft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const json = serializeRef.current?.() ?? "{}";
      const fullHtml = buildFullHtml(json);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contentJson: json, htmlSnapshot: fullHtml, cssSnapshot: selectedTemplateCss, templateId: selectedTemplateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "儲存失敗");
      }
      const data = await res.json() as { id?: string };
      if (data.id) router.push(`/dashboard/posts/edit/${data.id}`);
      else router.push("/dashboard/posts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存時發生錯誤");
    } finally {
      setDrafting(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const json = serializeRef.current?.() ?? "{}";
      const fullHtml = buildFullHtml(json);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contentJson: json, htmlSnapshot: fullHtml, cssSnapshot: selectedTemplateCss, templateId: selectedTemplateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "儲存失敗");
      }
      router.push("/dashboard/posts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存時發生錯誤");
    } finally {
      setSaving(false);
    }
  };

  const sidebarTop = toolbarOpen ? "top-[124px]" : "top-[72px]";

  return (
    <Editor resolver={{ Container, EvilEyeContainer, TextComponent, ImageComponent, CanvasContainer, MorphingTextComponent, TerminalComponent, ScrolltextComponent, RetroGridComponent, FlickeringGridComponent, CircularGalleryComponent, PixelCardComponent, StepperComponent, DecryptedTextComponent }}>
      <main className="flex min-h-screen flex-col bg-[#F5F5F7]">
        <KeyboardHandler />

        {/* ─── Sticky 頂部區塊（Nav + 可展開工具列）────────────────────────── */}
        <div className="sticky top-0 z-40 flex flex-col border-b border-black/[0.06] bg-[#F5F5F7]/95 shadow-[0_1px_20px_rgba(0,0,0,0.04)] backdrop-blur-md">

          {/* Nav 列 */}
          <div className="px-4 py-3">
            <div className="mx-auto w-full max-w-7xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => router.push("/dashboard/posts")}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:shadow-md active:scale-95">
                    ← 返回文章目錄
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">新建文章 · 編輯器</h1>
                    <p className="text-sm text-zinc-600">拖拉元件、雙擊文字即可編輯，完成後點擊發布。</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 工具列展開按鈕 */}
                  <button
                    type="button"
                    onClick={() => setToolbarOpen((v) => !v)}
                    title="展開/收合工具列"
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      toolbarOpen
                        ? "border-zinc-800 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{toolbarOpen ? "▲" : "▼"}</span> 工具列
                  </button>
                  <button type="button" onClick={handlePreview}
                    className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50">
                    視窗預覽
                  </button>
                  <button type="button" onClick={handleSaveDraft} disabled={drafting || saving}
                    className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60">
                    {drafting ? "儲存中…" : "存為草稿"}
                  </button>
                  <button type="button" onClick={handlePublish} disabled={saving || drafting}
                    className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? "發布中…" : "發布文章"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 可展開工具列（向下擠壓，不遮擋畫布）*/}
          <div
            className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
              toolbarOpen ? "max-h-24" : "max-h-0"
            }`}
          >
            <div className="border-t border-black/[0.06] px-4 py-3">
              <div className="mx-auto w-full max-w-7xl">
                <TopToolbarContent
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={setSelectedTemplateId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 主內容區域 ────────────────────────────────────────────────────── */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
          <div className="flex gap-5">

            {/* 左側面板（簡化版：僅標題輸入 + 元件工具箱 + 快捷鍵）*/}
            <div className="hidden w-56 shrink-0 lg:block">
              <div className={`sticky ${sidebarTop} flex flex-col gap-4`}>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">文章標題</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="輸入文章標題"
                  />
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <SidebarToolset />
                </div>
              </div>
            </div>

            {/* 畫布 */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-xl">
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Canvas</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                </div>
                <CanvasToolbar />
                <div className="flex justify-center">
                  <div className="w-full max-w-[800px] rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-black/5">
                    <EditorCanvas queryRef={serializeRef} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    </Editor>
  );
}
