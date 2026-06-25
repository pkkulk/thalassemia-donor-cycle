"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Surface } from "./surface";

interface SectionShellProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  containerClassName?: string;
}

export function SectionShell({
  title,
  subtitle,
  action,
  className = "",
  containerClassName = "",
  children,
  ...props
}: SectionShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`h-full ${containerClassName}`.trim()}
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <Surface
        className={`relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-5 sm:p-6 ${className}`.trim()}
        {...props}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--cr-400)] to-transparent opacity-70"
          initial={false}
          animate={reduceMotion ? undefined : { opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--foreground)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </Surface>
    </motion.div>
  );
}
