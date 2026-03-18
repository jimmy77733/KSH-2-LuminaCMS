import Link from "next/link";
import { db } from "@/lib/db";
import ScrollStack, { ScrollStackItem } from "@/components/home/ScrollStack";
import ThemeToggle from "@/components/home/ThemeToggle";

type PublishedPostRow = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  publishedUrl: string | null;
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

export default function Home() {
  const posts = db
    .prepare(
      `SELECT id, slug, title, createdAt, publishedUrl
       FROM Post
       WHERE publishedUrl IS NOT NULL AND TRIM(publishedUrl) <> ''
       ORDER BY rowid DESC`,
    )
    .all() as PublishedPostRow[];

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 dark:bg-black dark:text-zinc-50">
      {/* Global Nav */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/60 backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              ✦
            </span>
            <span className="text-sm font-semibold tracking-tight">LuminaCMS</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              LOG IN
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            LuminaCMS
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            已發布文章
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-300">
            以下內容來自本機資料庫中「已發布」的文章清單。點擊卡片即可開啟已發布頁面（或本地預覽）。
          </p>
        </div>
      </section>

      {/* ScrollStack */}
      <section className="mt-4">
        <ScrollStack className="pb-24" blurAmount={0} rotationAmount={0}>
          {posts.length === 0 ? (
            <ScrollStackItem>
              <div className="p-7">
                <p className="text-sm font-semibold">尚無已發布文章</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
                  你可以到 Dashboard 建立文章並使用 🚀 發布，首頁會自動顯示。
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    前往 Dashboard
                  </Link>
                  <Link
                    href="/dashboard/posts/new"
                    className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                  >
                    新建文章
                  </Link>
                </div>
              </div>
            </ScrollStackItem>
          ) : (
            posts.map((p) => {
              const href = p.publishedUrl?.trim()
                ? p.publishedUrl
                : `/dashboard/posts/preview/${p.id}`;
              return (
                <ScrollStackItem key={p.id}>
                  <a
                    href={href}
                    {...(href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="block p-7 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold tracking-tight">
                          {p.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
                          {formatDate(p.createdAt)}
                        </p>
                        <p className="mt-2 truncate rounded-lg bg-black/5 px-3 py-1 text-xs font-mono text-zinc-600 dark:bg-white/10 dark:text-zinc-200">
                          /{p.slug}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                        🌐 Published
                      </span>
                    </div>
                  </a>
                </ScrollStackItem>
              );
            })
          )}
        </ScrollStack>
      </section>
    </div>
  );
}
