"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
  slug: string;
};

export default function DownloadHtmlButton({ id, title, slug }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error("載入失敗");
      const data = (await res.json()) as { htmlSnapshot?: string };
      const html = data.htmlSnapshot;
      if (!html) throw new Error("此文章尚無 HTML 快照");

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "下載失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title={`下載《${title}》的 HTML`}
      className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "⏳" : "↓ HTML"}
    </button>
  );
}
