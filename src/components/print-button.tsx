"use client";

import { captureClient } from "@/lib/analytics/client";

export function PrintButton({ label = "Print", event }: { label?: string; event?: "presence_summary_downloaded" }) {
  return (
    <button
      type="button"
      onClick={() => { if (event) captureClient(event); window.print(); }}
      className="tap inline-flex h-12 items-center rounded-xl border border-ink-300 bg-white px-5 font-semibold hover:border-ink-900"
    >
      {label}
    </button>
  );
}
