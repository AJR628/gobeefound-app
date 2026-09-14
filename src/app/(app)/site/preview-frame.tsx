"use client";

import { useState } from "react";

// V4 §D rule 4 — the live preview is the REAL renderer in an iframe; the only thing this component
// controls is the frame's width. Desktop 1280 (scaled to fit), mobile 390.

export function PreviewFrame({ src, reloadKey }: { src: string; reloadKey: string | number }) {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Preview size" className="inline-grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
        {(["mobile", "desktop"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`h-10 rounded-lg px-4 text-sm font-medium ${mode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"}`}>
            {m === "mobile" ? "Phone" : "Desktop"}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-ink-300 bg-ink-100 p-2">
        {mode === "mobile" ? (
          <iframe key={`m-${reloadKey}`} title="Your website on a phone" src={src} className="mx-auto block h-[720px] w-[390px] max-w-full rounded-xl border border-ink-300 bg-white" />
        ) : (
          <div className="w-full overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
            <iframe key={`d-${reloadKey}`} title="Your website on a desktop" src={src} className="origin-top-left rounded-xl border border-ink-300 bg-white" style={{ width: 1280, height: 800, transform: "scale(var(--scale))", ["--scale" as string]: "calc((100cqw) / 1280)" }} />
          </div>
        )}
      </div>
      <p className="text-xs text-ink-500">This is the exact page visitors will see — not a mock-up.</p>
    </div>
  );
}
