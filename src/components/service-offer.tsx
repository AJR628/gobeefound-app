import type { ServicePlacement } from "@/content";
import { clickOffer, dismissOffer, isOfferDismissed } from "@/lib/service-offer";

// §15.3 — the four placements. Never a modal, never above primary content, never in Module 1.
// Credit copy is RELATIVE ("what you paid for Launch"), never a fixed figure (§4).

const COPY: Record<ServicePlacement, { body: string; cta: string; quiet?: boolean }> = {
  task_3_1: {
    body: "That's the whole list. Most people spend 10–20 hours on it. If you'd rather not — we'll build it for $900, and what you paid for Launch comes off that.",
    cta: "See what's included",
  },
  task_3_4: {
    body: "Stuck here? This is the step people get stuck on. Send us your details and we'll point it for you.",
    cta: "Have gobeefound do this",
  },
  home_footer: {
    body: "Rather not build the website yourself? We'll build it for $900 — and what you paid for Launch comes off the price.",
    cta: "See what's included",
  },
  your_business_footer: {
    body: "Need something built or fixed? We're here.",
    cta: "Talk to us",
    quiet: true,
  },
};

export async function ServiceOffer({ placement, businessId }: { placement: ServicePlacement; businessId: string }) {
  if (await isOfferDismissed(businessId, placement)) return null;
  const c = COPY[placement];

  if (c.quiet) {
    return (
      <form action={clickOffer.bind(null, placement)} className="text-center">
        <button type="submit" className="h-11 text-sm text-ink-500 underline">
          {c.body}
        </button>
      </form>
    );
  }

  return (
    <aside aria-label="GoBeeFound website service" className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="text-[15px] text-ink-700">{c.body}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <form action={dismissOffer.bind(null, placement)}>
          <button type="submit" className="h-11 text-sm text-ink-500 underline">Not now</button>
        </form>
        <form action={clickOffer.bind(null, placement)}>
          <button type="submit" className="h-11 rounded-lg px-3 text-sm font-semibold text-ink-900 underline">{c.cta} →</button>
        </form>
      </div>
    </aside>
  );
}
