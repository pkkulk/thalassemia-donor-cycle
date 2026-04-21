import type { HTMLAttributes } from "react";

type Tone = "rose" | "blue" | "emerald" | "amber" | "violet" | "slate";

export function StatusChip({
  tone = "slate",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`token-chip ${className}`.trim()}
      data-tone={tone}
      {...props}
    />
  );
}
