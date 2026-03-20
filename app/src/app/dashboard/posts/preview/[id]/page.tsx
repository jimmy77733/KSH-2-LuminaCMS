import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { PostHtmlViewer } from "@/components/editor/PostHtmlViewer";

type PostRow = {
  id: string;
  title: string;
  htmlSnapshot: string;
  createdAt: string;
};

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = db
    .prepare(
      "SELECT id, title, htmlSnapshot, createdAt FROM Post WHERE id = ? LIMIT 1",
    )
    .get(id) as PostRow | undefined;

  if (!post) {
    notFound();
  }

  return (
    <>
      {/* 浮動頂部工具列 */}
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-white/80 px-4 py-2 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/posts"
            className="rounded-full px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            ← 返回目錄
          </Link>
          <span className="text-sm font-medium text-zinc-800">
            預覽：{post.title}
          </span>
        </div>
        <Link
          href={`/dashboard/posts/edit/${post.id}`}
          className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          編輯
        </Link>
      </div>

      {/* 渲染 htmlSnapshot — 必須用 iframe srcdoc 才能執行 bgScript */}
      <PostHtmlViewer html={post.htmlSnapshot} />
    </>
  );
}
