"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcherInline } from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { ambientFloatVariants, panelVariants } from "@/lib/motion";

type AdminNavKey = "dashboard" | "directory" | "stats" | "health";

const NAV_ICONS: Record<string, string> = {
  dashboard: "◉",
  directory: "📋",
  stats: "📊",
  health: "❤️",
};

export default function AdminShell({
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  active: AdminNavKey;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const links: Array<{ key: AdminNavKey; href: string; label: string }> = [
    {
      key: "dashboard",
      href: "/dashboard",
      label: t("dashboard.nav.dashboard"),
    },
    {
      key: "directory",
      href: "/directory",
      label: t("dashboard.nav.directory"),
    },
    { key: "stats", href: "/stats", label: t("dashboard.nav.analytics") },
    { key: "health", href: "/health", label: t("dashboard.nav.health") },
  ];

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
        color: "var(--color-text-primary)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <motion.div
          variants={ambientFloatVariants}
          initial="initial"
          animate={reduceMotion ? "initial" : "animate"}
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(240,62,94,0.18), rgba(240,62,94,0))",
            filter: "blur(8px)",
          }}
        />
        <motion.div
          variants={ambientFloatVariants}
          initial="initial"
          animate={reduceMotion ? "initial" : "animate"}
          style={{
            position: "absolute",
            top: 160,
            right: -100,
            width: 340,
            height: 340,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(74,142,240,0.16), rgba(74,142,240,0))",
            filter: "blur(8px)",
          }}
        />
        <motion.div
          variants={ambientFloatVariants}
          initial="initial"
          animate={reduceMotion ? "initial" : "animate"}
          style={{
            position: "absolute",
            bottom: -140,
            left: "28%",
            width: 360,
            height: 360,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(34,176,122,0.14), rgba(34,176,122,0))",
            filter: "blur(10px)",
          }}
        />
      </div>
      {/* ── TOP NAV ── */}
      <motion.header
        variants={panelVariants}
        initial="hidden"
        animate="show"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--color-background-primary)",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          boxShadow: "var(--shadow-sm)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            height: 52,
            gap: 0,
            padding: "0 20px",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              marginRight: 28,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg, #F03E5E, #C0193A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                viewBox="0 0 16 16"
                style={{
                  width: 16,
                  height: 16,
                  fill: "none",
                  stroke: "#fff",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                }}
              >
                <path d="M8 2C8 2 4 5 4 9a4 4 0 008 0C12 5 8 2 8 2z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Hemo<span style={{ color: "var(--cr-600)" }}>Link</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav
            style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}
          >
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--r-md)",
                  fontSize: 13,
                  color:
                    link.key === active
                      ? "var(--cr-600)"
                      : "var(--color-text-secondary)",
                  background:
                    link.key === active ? "var(--cr-50)" : "transparent",
                  fontWeight: link.key === active ? 500 : 400,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all var(--dur-micro)",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            <LanguageSwitcherInline />
            <ThemeToggle inline />
            {/* Notification bell */}
            <button
              className="nav-btn"
              title="Notifications"
              style={{ position: "relative" }}
            >
              🔔
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cr-400)",
                  border: "1.5px solid var(--color-background-primary)",
                }}
              />
            </button>
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--r-full)",
                background: "var(--cr-100)",
                color: "var(--cr-800)",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              AD
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── PAGE LAYOUT ── */}
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="show"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: "calc(100vh - 52px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Sidebar */}
        <motion.aside
          variants={panelVariants}
          initial="hidden"
          animate="show"
          style={{
            background: "var(--color-background-primary)",
            borderRight: "0.5px solid var(--color-border-secondary)",
            padding: "16px 12px",
            position: "sticky",
            top: 52,
            height: "calc(100vh - 52px)",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              padding: "12px 8px 6px",
            }}
          >
            {t("sidebar.overview")}
          </p>
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                color:
                  link.key === active
                    ? "var(--cr-600)"
                    : "var(--color-text-secondary)",
                background:
                  link.key === active ? "var(--cr-50)" : "transparent",
                fontWeight: link.key === active ? 500 : 400,
                fontSize: 13,
                marginBottom: 2,
                textDecoration: "none",
                transition: "all var(--dur-micro)",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  fontSize: 14,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {NAV_ICONS[link.key]}
              </span>
              {link.label}
              {link.key === "directory" && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--cr-400)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--r-full)",
                  }}
                >
                  3
                </span>
              )}
            </Link>
          ))}

          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              padding: "12px 8px 6px",
            }}
          >
            {t("sidebar.operations")}
          </p>
          {[
            { href: "/dashboard", icon: "📅", label: t("sidebar.schedule") },
            {
              href: "/directory?tab=mappings",
              icon: "🔗",
              label: t("sidebar.mappings"),
              badge: "2",
            },
            { href: "/stats", icon: "📣", label: t("sidebar.nudges") },
            { href: "/stats", icon: "🏆", label: t("sidebar.leaderboard") },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                background: "transparent",
                fontSize: 13,
                marginBottom: 2,
                textDecoration: "none",
                transition: "all var(--dur-micro)",
              }}
            >
              <span
                style={{ width: 16, height: 16, fontSize: 14, flexShrink: 0 }}
              >
                {item.icon}
              </span>
              {item.label}
              {item.badge && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--cr-400)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--r-full)",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}

          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              padding: "12px 8px 6px",
            }}
          >
            {t("sidebar.admin")}
          </p>
          {[
            { href: "/", icon: "⚙️", label: t("sidebar.settings") },
            { href: "/", icon: "🌐", label: t("language.label") },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                background: "transparent",
                fontSize: 13,
                marginBottom: 2,
                textDecoration: "none",
                transition: "all var(--dur-micro)",
              }}
            >
              <span
                style={{ width: 16, height: 16, fontSize: 14, flexShrink: 0 }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </motion.aside>

        {/* Main content */}
        <motion.main
          variants={panelVariants}
          initial="hidden"
          animate="show"
          style={{ padding: "24px", overflowY: "auto", minHeight: 0 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 24,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginTop: 3,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {actions}
              </div>
            )}
          </div>

          {children}
        </motion.main>
      </motion.div>
    </div>
  );
}
