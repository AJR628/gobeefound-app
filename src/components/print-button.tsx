"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="tap inline-flex h-12 items-center rounded-xl border border-ink-300 bg-white px-5 font-semibold hover:border-ink-900"
    >
      {label}
    </button>
  );
}
