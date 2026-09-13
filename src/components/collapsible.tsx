/** Progressive disclosure (P3) with the platform's own <details>. Collapsed on load, no JS needed. */
export function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-ink-100 bg-white open:shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-medium marker:hidden">
        {title}
        <span aria-hidden className="text-ink-500 transition-transform group-open:rotate-90">▸</span>
      </summary>
      <div className="space-y-3 border-t border-ink-100 px-4 py-3 text-[15px] leading-relaxed text-ink-700">{children}</div>
    </details>
  );
}
