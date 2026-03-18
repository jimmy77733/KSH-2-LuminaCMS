import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

const NAV_CARDS = [
  {
    href: "/dashboard/posts",
    icon: "📝",
    title: "文章管理",
    desc: "檢視、編輯與刪除已發布文章",
    accent: "from-sky-50 to-blue-50",
    border: "border-sky-100",
    iconBg: "bg-sky-100",
  },
  {
    href: "/dashboard/media",
    icon: "🖼️",
    title: "媒體庫",
    desc: "上傳與管理圖片，自動產生 WebP 縮圖",
    accent: "from-violet-50 to-purple-50",
    border: "border-violet-100",
    iconBg: "bg-violet-100",
  },
  {
    href: "/dashboard/posts/new",
    icon: "✏️",
    title: "新建文章",
    desc: "使用拖拉式編輯器建立新內容",
    accent: "from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
  },
  {
    href: "/",
    icon: "🏠",
    title: "前往首頁",
    desc: "查看 LuminaCMS 首頁與已發布文章",
    accent: "from-amber-50 to-yellow-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100",
  },
] as const;

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* 歡迎橫幅 */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            LuminaCMS
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            歡迎回來，{session.username}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            角色：<span className="font-medium text-zinc-700">{session.role}</span>
          </p>
        </div>

        {/* 快速入口 Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group flex flex-col gap-3 rounded-3xl bg-gradient-to-br ${card.accent} border ${card.border} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg} text-2xl shadow-sm`}
              >
                {card.icon}
              </span>
              <div>
                <p className="text-[15px] font-semibold text-zinc-900">
                  {card.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {card.desc}
                </p>
              </div>
              <span className="mt-auto text-xs font-medium text-zinc-400 transition group-hover:text-zinc-600">
                前往 →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
