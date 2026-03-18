"use client";

import { useState } from "react";
import PublishProgressModal from "./PublishProgressModal";

type Props = {
  id: string;
  title: string;
};

export default function PublishButton({ id, title }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title={`發布《${title}》到 GitHub`}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        🚀 發布
      </button>

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
