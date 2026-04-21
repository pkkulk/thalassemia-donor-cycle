import type { HTMLAttributes, ReactNode } from "react";
import { Surface } from "./surface";

interface SectionShellProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionShell({
  title,
  subtitle,
  action,
  className = "",
  children,
  ...props
}: SectionShellProps) {
  return (
    <Surface
      className={`rounded-[1.75rem] p-5 sm:p-6 ${className}`.trim()}
      {...props}
    >
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
      {children}
    </Surface>
  );
}
