"use client";

import { useState } from "react";
import PublishProgressModal from "./PublishProgressModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Props = {
  id: string;
  title: string;
  publishedUrl?: string;
  publishedAt?: string;
};

function formatDateTime(raw: string) {
  try {
    return new Date(raw).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export default function PublishButton({ id, title, publishedUrl, publishedAt }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (publishedUrl) setConfirmOpen(true);
          else setShowModal(true);
        }}
        title={`發布《${title}》到 GitHub`}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        🚀 發布
      </button>

      <ConfirmModal
        open={confirmOpen}
        title="確認重新發布？"
        message={`此文章已於 ${
          publishedAt ? formatDateTime(publishedAt) : "先前"
        } 發布至：${publishedUrl}。重新發布將覆蓋 GitHub 上的舊版本。`}
        cancelLabel="取消"
        confirmLabel="確認更新"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setShowModal(true);
        }}
      />

      {showModal && (
        <PublishProgressModal
          postId={id}
          title={title}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
