"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
};

export default function PackAssetsButton({ id, title }: Props) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error("載入失敗");
      const data = (await res.json()) as { htmlSnapshot?: string };
      const html = data.htmlSnapshot ?? "";

      // 掃描 htmlSnapshot 中所有 /uploads/ 路徑的圖片
      const matches = [
        ...html.matchAll(/(?:src|srcset)="(\/uploads\/[^"]+)"/g),
      ];
      const paths = [...new Set(matches.map((m) => m[1]))];
      setAssets(paths);
    } catch (e) {
      alert(e instanceof Error ? e.message : "掃描失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!assets || assets.length === 0) return;
    try {
      await navigator.clipboard.writeText(assets.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("複製失敗，請手動複製清單");
    }
  };

  const handleDownloadManifest = () => {
    if (!assets || assets.length === 0) return;
    const content = [
      `# LuminaCMS Assets Manifest`,
      `# Post ID: ${id}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Phase 5 自動發布預備清單`,
      ``,
      ...assets,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assets-manifest-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleScan}
        disabled={loading}
        title={`掃描《${title}》的圖片資源（Phase 5 準備）`}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "⏳" : "📦 資源"}
      </button>

      {/* 資源清單 Modal */}
      {assets !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setAssets(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">📦 資源清單</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Phase 5 自動發布預備 — 圖片資源掃描</p>
              </div>
              <button
                type="button"
                onClick={() => setAssets(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {/* 掃描結果 */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold text-zinc-700">
                掃描到 <span className="text-violet-600">{assets.length}</span> 個圖片資源
              </p>

              {assets.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center">
                  <p className="text-sm text-zinc-400">此文章尚無圖片資源</p>
                  <p className="mt-1 text-xs text-zinc-300">需先儲存/發布含圖片的文章</p>
                </div>
              ) : (
                <ul
                  className="max-h-52 space-y-1 overflow-y-auto rounded-2xl bg-zinc-50 p-3 text-xs"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 transparent" }}
                >
                  {assets.map((path, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 font-mono text-zinc-700 shadow-sm ring-1 ring-black/5"
                    >
                      <span className="shrink-0 text-violet-400">↳</span>
                      <span className="truncate">{path}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              {assets.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 rounded-full bg-zinc-900 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
                  >
                    {copied ? "✓ 已複製" : "複製清單"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadManifest}
                    className="flex-1 rounded-full border border-violet-200 bg-violet-50 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    ↓ 下載 Manifest
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setAssets(null)}
                className="flex-1 rounded-full border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
