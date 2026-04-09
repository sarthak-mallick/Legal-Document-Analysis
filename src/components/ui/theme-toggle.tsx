"use client";

import { useEffect, useRef, useState } from "react";

// Simple dark/light mode toggle button.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    if (isDark) {
      // Schedule state update for next tick to avoid synchronous setState in effect
      queueMicrotask(() => setDark(true));
    }
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground transition hover:bg-muted"
      aria-label="Toggle theme"
      type="button"
    >
      {dark ? "L" : "D"}
    </button>
  );
}
