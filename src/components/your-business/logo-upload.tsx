"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** The single file upload in the product (§12.1). PNG/JPEG only; server re-validates by magic bytes. */
export function LogoUpload({ signedUrl }: { signedUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) return setError("That file is over 2 MB. Please use a smaller image.");
    if (!["image/png", "image/jpeg"].includes(file.type)) return setError("Please upload a PNG or JPEG.");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/logo", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return setError(j.error ?? "Upload failed. Please try again.");
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/logo", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="py-3">
      <div className="text-xs text-ink-500">Logo</div>
      <div className="mt-2 flex items-center gap-4">
        {signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signedUrl} alt="Your logo" className="h-16 w-16 rounded-lg border border-ink-100 object-contain bg-white" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-ink-300 text-xs text-ink-500">None</div>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-11 rounded-lg border border-ink-300 bg-white px-3 text-sm font-medium hover:border-ink-900 disabled:opacity-50">
            {busy ? "Working…" : signedUrl ? "Replace" : "Upload PNG or JPEG"}
          </button>
          {signedUrl && (
            <button type="button" disabled={busy} onClick={remove} className="h-11 px-3 text-sm text-ink-500 underline disabled:opacity-50">Remove</button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-danger-500">{error}</p>}
      <p className="mt-1.5 text-xs text-ink-500">Max 2 MB. You don't need a logo to get customers — your name in a clean font is fine for year one.</p>
    </div>
  );
}
