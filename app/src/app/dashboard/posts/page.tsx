import Link from "next/link";
import { db } from "@/lib/db";
import DeleteButton from "@/components/posts/DeleteButton";
import DownloadHtmlButton from "@/components/posts/DownloadHtmlButton";
import PackAssetsButton from "@/components/posts/PackAssetsButton";
import PublishButton from "@/components/posts/PublishButton";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  publishedUrl: string | null;
  publishedAt: string | null;
};

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

export default function PostsPage() {
  const posts = db
    .prepare(
      `SELECT id, slug, title, createdAt, publishedUrl, publishedAt
       FROM Post
       ORDER BY rowid DESC`,
    )
    .all() as PostRow[];

  return (
    <main className="min-h-screen bg-[#F5F5F7]">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#F5F5F7]/85 px-4 py-3 shadow-[0_1px_20px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                文章管理
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                共 {posts.length} 篇文章
              </p>
            </div>
            <Link
              href="/dashboard/posts/new"
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-zinc-800"
            >
              + 新建文章
            </Link>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white py-16 shadow-sm ring-1 ring-black/5">
            <span className="text-5xl">📄</span>
            <p className="text-base font-medium text-zinc-700">
              尚無文章，立即建立第一篇！
            </p>
            <Link
              href="/dashboard/posts/new"
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              新建文章
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            {posts.map((post, index) => (
              <div
                key={post.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  index !== 0 ? "border-t border-zinc-100" : ""
                }`}
              >
                {/* 文字資訊 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-zinc-900">
                    {post.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatDate(post.createdAt)} · /{post.slug}
                  </p>
                  {post.publishedUrl && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          🌐 已發布
                        </span>
                        <a
                          href={post.publishedUrl}
                          {...(post.publishedUrl.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          aria-label="開啟已發布網頁"
                          title="開啟已發布網頁"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-700/80 ring-1 ring-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          ↗
                        </a>
                      </span>
                    </div>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex shrink-0 items-center gap-1">
                  {post.publishedUrl ? (
                    <a
                      href={post.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                    >
                      查看
                    </a>
                  ) : (
                    <Link
                      href={`/dashboard/posts/preview/${post.id}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
                    >
                      查看
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/posts/edit/${post.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    編輯
                  </Link>
                  <DownloadHtmlButton id={post.id} title={post.title} slug={post.slug} />
                  <PackAssetsButton id={post.id} title={post.title} />
                  <PublishButton id={post.id} title={post.title} publishedUrl={post.publishedUrl ?? undefined} publishedAt={post.publishedAt ?? undefined} />
                  <DeleteButton id={post.id} title={post.title} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-700"
          >
            ← 返回 Dashboard
          </Link>
        </div>
      </div>{/* end content wrapper */}
    </main>
  );
}
