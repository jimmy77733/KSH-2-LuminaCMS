"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "確定",
  cancelLabel = "取消",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] overflow-hidden rounded-[24px] bg-white/85 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 文字區 */}
        <div className="px-6 pb-4 pt-6 text-center">
          <p className="text-[17px] font-semibold leading-snug text-zinc-900">
            {title}
          </p>
          {message && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              {message}
            </p>
          )}
        </div>

        {/* iOS 分割按鈕列 */}
        <div className="grid grid-cols-2 divide-x divide-zinc-200 border-t border-zinc-200">
          <button
            type="button"
            onClick={onCancel}
            className="py-3.5 text-[16px] font-normal text-zinc-600 transition hover:bg-zinc-50 active:bg-zinc-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`py-3.5 text-[16px] font-semibold transition hover:bg-zinc-50 active:bg-zinc-100 ${
              destructive ? "text-red-500" : "text-sky-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
