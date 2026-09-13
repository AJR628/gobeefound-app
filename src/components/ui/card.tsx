import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}
      {...props}
    />
  );
}

export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500", className)} {...props} />;
}
