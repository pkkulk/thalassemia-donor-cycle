import type { HTMLAttributes } from "react";

export function Surface({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`token-panel ${className}`.trim()} {...props} />;
}
