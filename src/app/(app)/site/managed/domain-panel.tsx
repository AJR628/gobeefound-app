"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice";
import { FieldError, Input, Label } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";
import { checkDomain, connectDomain, disconnectDomain } from "./actions";

// V4 §I — exactly the owner's example: Connect mikesjunkremoval.com → Record 1 / Record 2 with copy →
// [Open <provider> DNS] → [I added them — check my domain] → ✓ Domain connected ✓ HTTPS ✓ Live.

type Record_ = { type: string; host: string; value: string; purpose: string };
type Domain = { id: string; domain: string; state: string; dnsProvider: string | null; lastError: string | null; records: Record_[] };
type Provider = { id: string; label: string; dnsUrl: string; tips: string[] };

export function DomainPanel({ domains, providers }: { domains: Domain[]; providers: Provider[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState<string>("porkbun");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { message: string; detail: string[]; mxWarning: string | null }>>({});

  function add() {
    setError(null);
    start(async () => {
      const r = await connectDomain({ domain, dnsProvider: provider });
      if (!r.ok) return setError(r.error ?? "Couldn't add that domain.");
      setDomain("");
      router.refresh();
    });
  }
  function check(id: string) {
    start(async () => {
      const r = await checkDomain({ id });
      setResults({ ...results, [id]: { message: r.message, detail: r.detail, mxWarning: r.mxWarning } });
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-ink-100 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Your own domain</h2>

      {domains.map((d) => {
        const p = providers.find((x) => x.id === d.dnsProvider) ?? providers[providers.length - 1]!;
        const res = results[d.id];
        const done = d.state === "active";
        return (
          <div key={d.id} className="rounded-xl border border-ink-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Connect {d.domain}</h3>
              <button type="button" disabled={pending} onClick={() => start(async () => { await disconnectDomain({ id: d.id }); router.refresh(); })} className="h-10 text-xs text-ink-500 underline">Remove</button>
            </div>

            {done ? (
              <ul className="mt-3 space-y-1 text-[15px] text-good-500">
                <li>✓ Domain connected</li>
                <li>✓ Secure HTTPS active</li>
                <li>✓ Website live at <a className="underline" href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer">{d.domain}</a></li>
              </ul>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-700">Add these {d.records.length} records at {p.label}. <strong>Don't change your nameservers</strong> — just add these, and leave any email records exactly as they are.</p>
                <ol className="mt-3 space-y-3">
                  {d.records.map((r, i) => (
                    <li key={i} className="rounded-lg bg-honey-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Record {i + 1} · {r.purpose}</p>
                      <dl className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-[15px]">
                        <dt className="text-ink-500">Type</dt><dd className="font-mono">{r.type}</dd><dd />
                        <dt className="text-ink-500">Host</dt><dd className="break-all font-mono">{r.host}</dd><dd><CopyButton value={r.host} /></dd>
                        <dt className="text-ink-500">Value</dt><dd className="break-all font-mono">{r.value}</dd><dd><CopyButton value={r.value} /></dd>
                      </dl>
                    </li>
                  ))}
                </ol>
                {p.tips.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-ink-500">{p.tips.map((t, i) => <li key={i}>• {t}</li>)}</ul>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {p.dnsUrl && <a href={p.dnsUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-12 items-center justify-center rounded-xl border border-ink-900 bg-white px-4 font-semibold">Open {p.label} DNS ↗</a>}
                  <Button size="lg" onClick={() => check(d.id)} disabled={pending}>{pending ? "Checking…" : "I added them — check my domain"}</Button>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {d.state === "dns_verified" && !res && <p className="text-good-500">✓ Domain connected · Turning on HTTPS — check again in a few minutes.</p>}
                  {res && <p className={d.state === "pending" ? "text-ink-700" : "text-good-500"}>{res.message}</p>}
                  {res?.detail.map((x, i) => <p key={i} className="text-xs text-ink-500">{x}</p>)}
                  {res?.mxWarning && <p className="rounded-lg bg-honey-100 p-2 text-xs text-ink-900">{res.mxWarning}</p>}
                  {!res && d.lastError && d.state === "pending" && <p className="text-xs text-ink-500">Last check: {d.lastError}</p>}
                </div>
              </>
            )}
          </div>
        );
      })}

      {domains.length < 2 && (
        <div className="space-y-3 border-t border-ink-100 pt-4">
          <div>
            <Label htmlFor="domain">{domains.length ? "Add another domain" : "Your domain"}</Label>
            <Input id="domain" placeholder="mikesjunkremoval.com" value={domain} onChange={(e) => setDomain(e.target.value)} autoCapitalize="none" autoCorrect="off" inputMode="url" />
            <p className="mt-1 text-xs text-ink-500">The one you bought in Module 2. No need to type www.</p>
          </div>
          <div>
            <Label>Where do you manage it?</Label>
            <ChoiceGroup name="DNS provider" value={provider} columns={2} onChange={setProvider} options={providers.map((p) => ({ value: p.id, label: p.label }))} />
          </div>
          <FieldError>{error}</FieldError>
          <Button onClick={add} disabled={pending || domain.trim().length < 4}>{pending ? "Adding…" : "Show me the records"}</Button>
        </div>
      )}
    </section>
  );
}
