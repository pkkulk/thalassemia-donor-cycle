"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Theme = "light" | "dark";
const STORAGE_KEY = "dashboard-theme";

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    root.classList.toggle("dark", initial === "dark");
    root.style.colorScheme = initial;
    setTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  // Avoid hydration mismatch — render neutral shell until mounted
  const icon = !mounted ? "◑" : theme === "dark" ? "☀" : "◑";

  return (
    <motion.button
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.03, rotate: 2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96, rotate: 0 }}
      className="nav-btn"
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "var(--r-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        transition: "all var(--dur-micro)",
        color: "var(--color-text-secondary)",
      }}
    >
      {icon}
    </motion.button>
  );
}
