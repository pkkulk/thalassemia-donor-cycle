"use client";

import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

type Theme = "light" | "dark";

const STORAGE_KEY = "dashboard-theme";

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferredDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme: Theme = saved ?? (preferredDark ? "dark" : "light");

    root.classList.toggle("dark", initialTheme === "dark");
    root.style.colorScheme = initialTheme;
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;

    root.classList.toggle("dark", nextTheme === "dark");
    root.style.colorScheme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={
        inline
          ? "h-10 w-10 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          : "fixed top-4 right-4 z-[70] h-11 w-11 rounded-full border border-slate-300 bg-white/90 text-slate-700 backdrop-blur-sm shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-100"
      }
    >
      <span className="flex items-center justify-center text-base">
        {theme === "dark" ? <FaSun /> : <FaMoon />}
      </span>
    </button>
  );
}
