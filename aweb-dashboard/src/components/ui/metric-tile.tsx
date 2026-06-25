"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Surface } from "./surface";
import { StatusChip } from "./status-chip";

interface MetricTileProps {
  label: string;
  value: string | number;
  tone?: "rose" | "blue" | "emerald" | "amber" | "violet" | "slate";
  icon?: ReactNode;
  footer?: string;
}

export function MetricTile({
  label,
  value,
  tone = "slate",
  icon,
  footer,
}: MetricTileProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative"
    >
      <Surface className="relative overflow-hidden rounded-[1.5rem] p-5 transition-shadow duration-300 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,62,94,0.12),transparent_42%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
              {label}
            </p>
            <motion.p
              className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]"
              initial={false}
              animate={reduceMotion ? undefined : { scale: [1, 1.01, 1] }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {value}
            </motion.p>
            {footer ? (
              <div className="mt-3">
                <StatusChip tone={tone}>{footer}</StatusChip>
              </div>
            ) : null}
          </div>
          {icon ? (
            <motion.div
              className="rounded-2xl border border-[color:var(--border-1)] bg-[color:var(--surface-2)] p-3 text-[color:var(--text-muted)] shadow-sm"
              initial={false}
              animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {icon}
            </motion.div>
          ) : null}
        </div>
      </Surface>
    </motion.div>
  );
}
