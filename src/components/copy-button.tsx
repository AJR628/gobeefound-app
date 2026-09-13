"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** One-tap copy (P16). The most-used control in the product. */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      disabled={!value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — silent */
        }
      }}
      className={cn(
        "h-11 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors",
        copied ? "border-good-500 bg-good-500/10 text-good-500" : "border-ink-300 bg-white text-ink-700 hover:border-ink-900",
        "disabled:opacity-40",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
