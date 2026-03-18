"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

type MediaItem = {
  id: string;
  originalName: string;
  altText: string | null;
  paths: {
    large: string;
    small: string;
    thumb: string;
  };
};

export default function MediaLibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error("無法載入媒體資料");
      const data = (await res.json()) as MediaItem[];
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleUpload(files: FileList | null, alt?: string) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const file = files[0];
      const form = new FormData();
      form.append("file", file);
      if (alt) form.append("alt", alt);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error("上傳失敗");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳時發生錯誤");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("刪除失敗");
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除時發生錯誤");
    }
  }

  function copyToClipboard(text: string) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-zinc-50/85 px-4 py-3 shadow-[0_1px_20px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:shadow-md active:scale-95"
              >
                ← 返回 Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  媒體庫管理
                </h1>
                <p className="text-sm text-zinc-500">
                  上傳、瀏覽與管理 LuminaCMS 的圖片資產。
                </p>
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">

        {/* 上傳區域 */}
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-8 text-center text-sm text-zinc-600 hover:bg-zinc-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              disabled={uploading}
            />
            <span className="font-medium">
              {uploading ? "上傳中..." : "點擊選擇圖片上傳"}
            </span>
            <span className="text-xs text-zinc-500">
              支援單檔上傳，系統會自動產生 large/small/thumb 三種 WebP 規格。
            </span>
          </label>
        </section>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* 媒體網格 */}
        <section>
          {loading ? (
            <p className="text-sm text-zinc-500">載入中...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">尚未上傳任何圖片。</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group relative flex aspect-square flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => setSelected(item)}
                >
                  {/* thumb 預覽 */}
                  {item.paths.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.paths.thumb}
                      alt={item.altText || item.originalName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400">
                      無預覽
                    </div>
                  )}
                  {/* 刪除按鈕 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-10 text-xs text-white opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                    <span className="line-clamp-1">
                      {item.altText || item.originalName}
                    </span>
                    <span
                      className="cursor-pointer rounded bg-red-500 px-2 py-0.5 text-[11px] font-medium hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(item);
                      }}
                    >
                      刪除
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>{/* end content wrapper */}

      {/* 詳細資訊 Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.altText || selected.originalName}
                </h2>
                <p className="text-xs text-zinc-500">{selected.originalName}</p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <div className="grid gap-0 border-b md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="flex items-center justify-center bg-zinc-50 p-6">
                {/* large 規格預覽 */}
                {selected.paths.large ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.paths.large}
                    alt={selected.altText || selected.originalName}
                    className="max-h-[50vh] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center text-sm text-zinc-400">
                    無 large 規格預覽
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4 border-t p-6 md:border-l md:border-t-0">
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-zinc-800">
                    Meta
                  </h3>
                  <dl className="space-y-1 text-xs text-zinc-600">
                    <div>
                      <dt className="inline text-zinc-500">檔名：</dt>
                      <dd className="inline break-all">
                        {selected.originalName}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-500">Alt：</dt>
                      <dd className="inline">
                        {selected.altText || <span className="text-zinc-400">（未設定）</span>}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-800">
                    圖片 URL
                  </h3>
                  {(["large", "small", "thumb"] as const).map((key) => {
                    const url = selected.paths[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-xs font-medium uppercase text-zinc-500">
                          {key}
                        </span>
                        <input
                          readOnly
                          value={url}
                          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700"
                        />
                        <button
                          type="button"
                          disabled={!url}
                          className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => copyToClipboard(url)}
                        >
                          複製
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-3 text-xs text-zinc-500">
              <span>點擊右上角 ✕ 關閉視窗。</span>
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                onClick={() => setSelected(null)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={`刪除圖片`}
        message={`確定要刪除「${deleteTarget?.altText || deleteTarget?.originalName}」？此動作無法復原。`}
        confirmLabel="刪除"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          if (deleteTarget) void confirmDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}

