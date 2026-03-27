"use client";

import { useEffect, useState } from "react";

// Simple dark/light mode toggle button.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
      aria-label="Toggle theme"
      type="button"
    >
      {dark ? "L" : "D"}
    </button>
  );
}
