"use client";

import { useEffect, useState } from "react";

// ─── 發布流程定義 ──────────────────────────────────────────────────────────────
type Stage =
  | "compiling"
  | "uploading"
  | "publishing"
  | "success"
  | "error";

const STAGES: { key: Stage; label: string; duration: number }[] = [
  { key: "compiling",  label: "編譯中…",     duration: 1000 },
  { key: "uploading",  label: "上傳圖片…",   duration: 1600 },
  { key: "publishing", label: "更新 HTML…", duration: 1000 },
];

const STAGE_INDEX: Partial<Record<Stage, number>> = {
  compiling: 0,
  uploading: 1,
  publishing: 2,
};

// ─── 型別 ──────────────────────────────────────────────────────────────────────
type PublishResult = {
  ok: boolean;
  slug?: string;
  title?: string;
  pagesUrl?: string;
  htmlGhUrl?: string;
  imageCount?: number;
  results?: { path: string; status: string; error?: string }[];
  error?: string;
  hint?: string;
  detail?: string;
  missing?: string[];
};

type Props = {
  postId: string;
  title: string;
  onClose: () => void;
};

// ─── 主元件 ────────────────────────────────────────────────────────────────────
export default function PublishProgressModal({ postId, title, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("compiling");
  const [result, setResult] = useState<PublishResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 定時推進假進度（視覺動畫）
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (const s of STAGES.slice(0, -1)) {
      elapsed += s.duration;
      const key = STAGES[STAGES.findIndex((x) => x.key === s.key) + 1]?.key;
      if (key) {
        timers.push(
          setTimeout(() => { if (!cancelled) setStage(key); }, elapsed),
        );
      }
    }

    // 真實 API 請求
    const run = async () => {
      try {
        const res = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
        const data = (await res.json()) as PublishResult;

        if (!cancelled) {
          timers.forEach(clearTimeout);
          if (res.ok && data.ok) {
            setStage("success");
          } else {
            setStage("error");
          }
          setResult(data);
        }
      } catch (e) {
        if (!cancelled) {
          timers.forEach(clearTimeout);
          setStage("error");
          setResult({ ok: false, error: "NETWORK_ERROR", detail: String(e) });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = stage !== "success" && stage !== "error";
  const currentIdx = STAGE_INDEX[stage] ?? (stage === "success" ? 3 : -1);
  const progressPct = stage === "success" ? 100 : Math.round(((currentIdx) / STAGES.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-8 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={isRunning ? undefined : onClose}
    >
      <div
        className="mx-4 w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className={`px-6 pt-6 pb-4 ${stage === "success" ? "bg-emerald-50" : stage === "error" ? "bg-red-50" : "bg-white"}`}>
          <div className="flex items-start gap-3">
            {/* 狀態圖示 */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm ${
              stage === "success" ? "bg-emerald-500 text-white" :
              stage === "error"   ? "bg-red-500 text-white" :
              "bg-zinc-900 text-white"
            }`}>
              {stage === "success" ? "✓" : stage === "error" ? "✕" : "🚀"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-zinc-900">
                {stage === "success" ? "發布成功！" :
                 stage === "error"   ? "發布失敗" :
                 "正在發布到 GitHub…"}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-zinc-500">
                {title}
              </p>
            </div>
          </div>
        </div>

        {/* ── iOS 風格進度區域 ─────────────────────────────────────────────────── */}
        <div className="px-6 pb-2">
          {/* 進度條 */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                stage === "error" ? "bg-red-500" :
                stage === "success" ? "bg-emerald-500" :
                "bg-zinc-900"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 步驟清單 */}
          <ol className="mb-4 space-y-2.5">
            {STAGES.map((s, i) => {
              const done = currentIdx > i || stage === "success";
              const active = currentIdx === i && isRunning;
              const failed = stage === "error" && currentIdx === i;

              return (
                <li key={s.key} className="flex items-center gap-3">
                  {/* 步驟圓點 */}
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                    done    ? "bg-emerald-500 text-white" :
                    failed  ? "bg-red-400 text-white" :
                    active  ? "bg-zinc-900 text-white shadow-[0_0_0_4px_rgba(0,0,0,0.08)]" :
                              "bg-zinc-100 text-zinc-400"
                  }`}>
                    {done ? "✓" : failed ? "✕" : i + 1}
                  </span>
                  <span className={`text-[13px] font-medium ${
                    done ? "text-emerald-600" :
                    failed ? "text-red-500" :
                    active ? "text-zinc-900" :
                    "text-zinc-400"
                  }`}>
                    {s.label}
                    {active && (
                      <span className="ml-1 inline-flex gap-0.5">
                        {[0, 1, 2].map((j) => (
                          <span
                            key={j}
                            className="inline-block h-1 w-1 rounded-full bg-zinc-400"
                            style={{ animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite` }}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* 成功後顯示連結 */}
          {stage === "success" && result && (
            <div className="mb-3 space-y-2 rounded-2xl bg-emerald-50 p-3">
              {result.pagesUrl && (
                <a
                  href={result.pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] font-medium text-emerald-700 hover:underline"
                >
                  <span>🌐</span>
                  <span className="truncate">GitHub Pages 預覽</span>
                  <span className="ml-auto shrink-0 text-emerald-400">↗</span>
                </a>
              )}
              {result.htmlGhUrl && (
                <a
                  href={result.htmlGhUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] font-medium text-emerald-700 hover:underline"
                >
                  <span>📄</span>
                  <span className="truncate">查看 HTML 原始碼</span>
                  <span className="ml-auto shrink-0 text-emerald-400">↗</span>
                </a>
              )}
              {typeof result.imageCount === "number" && result.imageCount > 0 && (
                <p className="text-[11px] text-emerald-600">
                  同步 {result.imageCount} 張圖片
                </p>
              )}

              {/* GitHub Pages 首次使用提示 */}
              <div className="mt-1 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-2 ring-1 ring-amber-200/60">
                <span className="shrink-0 text-amber-500 mt-0.5">⚠</span>
                <p className="text-[11px] leading-snug text-amber-700">
                  <span className="font-semibold">首次發布提示：</span>若出現 404，請至{" "}
                  <span className="font-mono">GitHub Settings › Pages</span>{" "}
                  將來源設定為 <span className="font-mono">main</span> 分支，
                  等待 1-2 分鐘後即可存取。
                </p>
              </div>
            </div>
          )}

          {/* 錯誤詳情 */}
          {stage === "error" && result && (
            <div className="mb-3 rounded-2xl bg-red-50 p-3">
              <p className="text-[12px] font-semibold text-red-700">
                {result.error === "GITHUB_NOT_CONFIGURED" ? "GitHub 尚未設定" :
                 result.error === "POST_NOT_FOUND" ? "找不到文章" :
                 result.error === "NO_HTML_SNAPSHOT" ? "尚無 HTML 快照" :
                 result.error ?? "發布時發生錯誤"}
              </p>
              {result.hint && (
                <p className="mt-1 text-[11px] text-red-600">{result.hint}</p>
              )}
              {result.missing && result.missing.length > 0 && (
                <div className="mt-2 rounded-xl bg-red-100 px-2.5 py-1.5">
                  <p className="text-[10px] font-mono text-red-700">
                    缺少環境變數：{result.missing.join(", ")}
                  </p>
                </div>
              )}
              {(result.detail || result.results?.some((r) => r.status === "error")) && (
                <button
                  type="button"
                  onClick={() => setShowDetail((v) => !v)}
                  className="mt-2 text-[11px] text-red-500 hover:text-red-700"
                >
                  {showDetail ? "收起詳情 ▲" : "查看詳情 ▼"}
                </button>
              )}
              {showDetail && (
                <pre className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap break-all text-[10px] text-red-500">
                  {result.detail ?? result.results?.filter(r => r.status === "error").map(r => `${r.path}: ${r.error}`).join("\n")}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* ── Footer 按鈕 ──────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6">
          {isRunning ? (
            <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-zinc-400">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-600"
                style={{ animation: "spin 0.8s linear infinite" }}
              />
              正在與 GitHub 通訊…
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`w-full rounded-full py-2.5 text-sm font-semibold transition ${
                stage === "success"
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-zinc-900 text-white hover:bg-zinc-700"
              }`}
            >
              {stage === "success" ? "完成" : "關閉"}
            </button>
          )}
        </div>
      </div>

      {/* 動畫 keyframes（inline style tag）*/}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
