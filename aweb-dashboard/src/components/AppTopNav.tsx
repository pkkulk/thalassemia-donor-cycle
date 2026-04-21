"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import ThemeToggle from "@/components/ThemeToggle";
import { LanguageSwitcherInline } from "@/components/LanguageSwitcher";

type NavKey = "dashboard" | "directory" | "stats" | "health";

export default function AppTopNav({ active }: { active: NavKey }) {
  const { t } = useI18n();

  const links: Array<{
    key: NavKey;
    href: string;
    label: string;
    icon: string;
  }> = [
    {
      key: "dashboard",
      href: "/dashboard",
      label: t("dashboard.nav.dashboard"),
      icon: "📊",
    },
    {
      key: "directory",
      href: "/directory",
      label: t("dashboard.nav.directory"),
      icon: "📋",
    },
    {
      key: "stats",
      href: "/stats",
      label: t("dashboard.nav.analytics"),
      icon: "📈",
    },
    {
      key: "health",
      href: "/health",
      label: t("dashboard.nav.health"),
      icon: "🩺",
    },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-2 px-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
        HemoLink Admin
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2">
          {links.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`px-4 py-2.5 rounded-full text-sm font-bold uppercase tracking-tight transition-all ${
                  isActive
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:border-slate-500"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 justify-end">
          <LanguageSwitcherInline className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
          <ThemeToggle inline />
        </div>
      </div>
    </div>
  );
}
