"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { captureClient } from "@/lib/analytics/client";

type CopyEvent = { name: "known_value_copied" | "referral_link_copied" | "generator_output_copied"; props?: Record<string, unknown> };

/** One-tap copy (P16). The most-used control in the product. */
export function CopyButton({ value, label = "Copy", className, event }: { value: string; label?: string; className?: string; event?: CopyEvent }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      disabled={!value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          if (event) captureClient(event.name, event.props);
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
