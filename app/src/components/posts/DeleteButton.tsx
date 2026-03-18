"use client";

import { useState, useTransition } from "react";
import { deletePostAction } from "@/app/dashboard/posts/actions";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Props = {
  id: string;
  title: string;
};

export default function DeleteButton({ id, title }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    startTransition(async () => {
      await deletePostAction(id);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>

      <ConfirmModal
        open={open}
        title={`刪除《${title}》`}
        message="此操作無法復原，確定要刪除這篇文章嗎？"
        confirmLabel="刪除"
        cancelLabel="取消"
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
