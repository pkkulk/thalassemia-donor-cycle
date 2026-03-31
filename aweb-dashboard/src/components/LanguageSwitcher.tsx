"use client";

import {
  I18N_ENABLED,
  SUPPORTED_LANGUAGES,
  getStoredLanguage,
  setStoredLanguage,
  useI18n,
  type LanguageCode,
} from "@/lib/i18n";

export function LanguageSwitcherInline({ className }: { className?: string }) {
  const { language, t } = useI18n();

  if (!I18N_ENABLED) {
    return null;
  }

  return (
    <label
      htmlFor="language-switcher"
      className={
        className ||
        "fixed top-4 right-16 z-[70] flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-100"
      }
    >
      <span>{t("language.label")}</span>
      <select
        id="language-switcher"
        aria-label={t("language.label")}
        value={language}
        onChange={(event) => {
          const nextLanguage = event.target.value as LanguageCode;
          setStoredLanguage(nextLanguage);
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
      >
        {SUPPORTED_LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LanguageSwitcher() {
  return <LanguageSwitcherInline />;
}

export function initLanguageFromStorage() {
  if (!I18N_ENABLED || typeof window === "undefined") {
    return "en";
  }

  const lang = getStoredLanguage();
  document.documentElement.lang = lang;
  return lang;
}
