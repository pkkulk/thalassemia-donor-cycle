"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  I18N_ENABLED,
  SUPPORTED_LANGUAGES,
  getStoredLanguage,
  useI18n,
  type LanguageCode,
} from "@/lib/i18n";

// ─── Flag emoji map ───────────────────────────────────────────────────────────
const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  mr: "🇮🇳",
  ta: "🇮🇳",
  gu: "🇮🇳",
};

const LANG_NATIVE: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
};

export function LanguageSwitcherInline({ className }: { className?: string }) {
  const { language, t, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  if (!I18N_ENABLED) return null;

  // Close on outside click
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (code: LanguageCode) => {
    setOpen(false);
    if (code !== language) {
      setLanguage(code); // updates shared I18nContext state + localStorage
    }
  };

  const activeFlag = LANG_FLAGS[language] ?? "🌐";
  const activeNative = LANG_NATIVE[language] ?? language.toUpperCase();

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {/* Trigger chip */}
      <motion.button
        id="language-switcher-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
        onClick={() => setOpen((o) => !o)}
        whileHover={reduceMotion ? undefined : { y: -1 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px 5px 8px",
          borderRadius: "var(--r-full)",
          border: "0.5px solid var(--color-border-secondary)",
          background: open
            ? "var(--color-background-secondary)"
            : "transparent",
          cursor: "pointer",
          transition: "all var(--dur-micro)",
          color: "var(--color-text-secondary)",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{activeFlag}</span>
        <span style={{ letterSpacing: "-0.01em" }}>{activeNative}</span>
        <span
          style={{
            fontSize: 9,
            color: "var(--color-text-tertiary)",
            marginLeft: 1,
            transition: "transform var(--dur-micro)",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={t("language.label")}
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--r-xl)",
              boxShadow: "var(--shadow-lg)",
              minWidth: 180,
              zIndex: 200,
              overflow: "hidden",
              padding: "6px",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "8px 10px 6px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-tertiary)",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                marginBottom: 4,
              }}
            >
              {t("language.label")}
            </div>

            {SUPPORTED_LANGUAGES.map((entry) => {
              const isActive = entry.code === language;
              const flag = LANG_FLAGS[entry.code] ?? "🌐";
              const native = LANG_NATIVE[entry.code] ?? entry.label;
              return (
                <motion.button
                  key={entry.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(entry.code as LanguageCode)}
                  whileHover={reduceMotion ? undefined : { x: 2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: "var(--r-md)",
                    border: "none",
                    background: isActive ? "var(--cr-50)" : "transparent",
                    cursor: "pointer",
                    transition: "all var(--dur-micro)",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--r-md)",
                      background: isActive
                        ? "var(--cr-100)"
                        : "var(--color-background-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {flag}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive
                          ? "var(--cr-600)"
                          : "var(--color-text-primary)",
                        lineHeight: 1.2,
                      }}
                    >
                      {native}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        marginTop: 1,
                      }}
                    >
                      {entry.label}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--cr-400)",
                        color: "#fff",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LanguageSwitcher() {
  return <LanguageSwitcherInline />;
}

export function initLanguageFromStorage() {
  if (!I18N_ENABLED || typeof window === "undefined") return "en";
  const lang = getStoredLanguage();
  document.documentElement.lang = lang;
  return lang;
}
