"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TempPreviewData = {
  html: string;
  title: string;
  postId?: string;
};

const STORAGE_KEY = "lumina_temp_preview";

export default function TempPreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<TempPreviewData | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw) as TempPreviewData);
    } catch {
      /* 略過解析錯誤 */
    }
  }, []);

  const handlePublish = async () => {
    if (!data) return;
    setPublishing(true);
    try {
      const endpoint = data.postId
        ? `/api/posts/${data.postId}`
        : "/api/posts";
      const method = data.postId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          contentJson: "{}",
          htmlSnapshot: data.html,
          cssSnapshot: "",
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(`發布失敗：${d.error ?? "未知錯誤"}`);
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      router.push("/dashboard/posts");
    } catch (e) {
      alert(e instanceof Error ? e.message : "發布失敗");
    } finally {
      setPublishing(false);
    }
  };

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F5F7]">
        <p className="text-sm text-zinc-500">找不到預覽資料，請重新從編輯器生成預覽。</p>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-zinc-800"
        >
          關閉分頁
        </button>
      </main>
    );
  }

  return (
    <>
      {/* 頂部回饋列 */}
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-white/85 px-4 py-2 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            ← 返回編輯
          </button>
          <span className="max-w-[300px] truncate text-sm font-medium text-zinc-800">
            預覽：{data.title}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {publishing ? "發布中…" : "直接發布"}
        </button>
      </div>

      {/* 渲染完整 HTML — 必須用 iframe srcdoc，React dangerouslySetInnerHTML 不執行 <script> */}
      <iframe
        srcDoc={data.html}
        className="w-full"
        style={{ height: "calc(100vh - 48px)", border: "none", display: "block" }}
        sandbox="allow-scripts allow-same-origin"
        title="文章預覽"
      />
    </>
  );
}
