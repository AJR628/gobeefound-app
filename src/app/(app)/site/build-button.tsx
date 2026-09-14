"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

type Allowance = { label: string; used: number; limit: number };

/** "Build my website" — one website build per click intent (Idempotency-Key). */
export function BuildButton({ allowance, rebuild }: { allowance: Allowance; rebuild: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [left, setLeft] = useState(allowance);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const exhausted = left.used >= left.limit;

  async function build() {
    setBusy(true);
    setError(null);
    setRef(null);
    const res = await fetch("/api/site/build", { method: "POST", headers: { "Idempotency-Key": key } });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; allowance?: Allowance; generationId?: string };
    setBusy(false);
    if (j.allowance) setLeft(j.allowance);
    if (!res.ok || !j.ok) {
      setError(j.error ?? "We couldn't build that just now. Please try again.");
      if (j.generationId && res.status >= 500) setRef(j.generationId.slice(0, 8));
      if (res.status < 500 && res.status !== 429) setKey(crypto.randomUUID());
      return;
    }
    setKey(crypto.randomUUID());
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button fullWidth size="lg" onClick={build} disabled={busy || exhausted}>
        {busy ? "Building your website… about 30 seconds" : exhausted ? "No website builds left" : rebuild ? "Build it again from scratch" : "Build my website"}
      </Button>
      <p className="text-center text-xs text-ink-500">{left.label}{rebuild ? " · Approved sections are kept." : ""}{exhausted ? " · You can still edit every section by hand." : ""}</p>
      <FieldError>{error}</FieldError>
      {ref && <p className="text-center text-xs text-ink-500">If this keeps happening, tell us this code: {ref}</p>}
    </div>
  );
}
