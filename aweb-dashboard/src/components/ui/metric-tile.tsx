import type { ReactNode } from "react";
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
  return (
    <Surface className="relative overflow-hidden rounded-[1.5rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
            {value}
          </p>
          {footer ? (
            <div className="mt-3">
              <StatusChip tone={tone}>{footer}</StatusChip>
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-2xl border border-[color:var(--border-1)] bg-[color:var(--surface-2)] p-3 text-[color:var(--text-muted)] shadow-sm">
            {icon}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
