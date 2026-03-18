"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lcms_theme";

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null) ?? null;
    const next = saved ?? getSystemPref();
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-700 shadow-sm backdrop-blur-md transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
      aria-label="切換主題"
      title="切換主題"
    >
      {theme === "dark" ? "☾ 深色" : "☀ 淺色"}
    </button>
  );
}

