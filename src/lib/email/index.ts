// §16.5 (as amended, V4) — transactional email only. Welcome, receipt, refund, and the Managed lifecycle
// notices (welcome, payment failed, ended) plus the contact-form relay go through Resend. Password reset is
// sent by Supabase Auth (configure Supabase SMTP to use Resend — no code here).
// No nudges, no drip, no digest (§3). Failures are logged and never block the user action.

import { Resend } from "resend";
import { money } from "../purchase";

const FROM = "GoBeeFound <hello@gobeefound.com>";

function resend(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

async function send(to: string, subject: string, text: string): Promise<void> {
  const r = resend();
  if (!r) return; // not configured (local dev) — silently skip
  try {
    await r.emails.send({ from: FROM, to, subject, text });
  } catch (e) {
    console.error("[email] send failed", subject, e instanceof Error ? e.message : e);
  }
}

const app = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function sendWelcome(to: string): Promise<void> {
  await send(
    to,
    "Welcome to GoBeeFound",
    `Welcome.

Your launch plan is waiting. Pick up where you left off any time:
${app()}/home

Module 1 and Your Business are free — no card needed until you're ready.

— GoBeeFound`,
  );
}

export async function sendReceipt(to: string, amountCents: number, creditExpiresAt: Date): Promise<void> {
  await send(
    to,
    "Your GoBeeFound Launch receipt",
    `Thanks — you've unlocked Launch.

Amount paid: ${money(amountCents)}
Refund policy: 30 days, no questions asked. Just reply to this email.

Your credit: if you decide you'd rather have us build your website, ${money(amountCents)} comes off the $900 price. Valid until ${creditExpiresAt.toLocaleDateString("en-US", { dateStyle: "long" })}.

Back to your plan: ${app()}/home

— GoBeeFound`,
  );
}

// ---------------------------------------------------------------------------------------------
// V4 §F — Managed lifecycle notices. Plain, honest, one action each.
// ---------------------------------------------------------------------------------------------

export async function sendManagedWelcome(to: string, siteUrl: string): Promise<void> {
  await send(
    to,
    "Your website is live",
    `Your website is online:
${siteUrl}

Next, connect your own domain — it takes two records at the company where you bought it, and we show you exactly what to add:
${app()}/site/managed

Change anything any time in GoBeeFound and publish with one tap. You can also download the whole site whenever you like.

— GoBeeFound`,
  );
}

export async function sendPaymentFailed(to: string, fixUrl: string, until: Date | null): Promise<void> {
  const date = until ? until.toLocaleDateString("en-US", { dateStyle: "long" }) : "a few days";
  await send(
    to,
    "We couldn't take your website payment",
    `Your card for GoBeeFound Managed didn't go through.

Nothing has changed yet: your website stays live until ${date}. Update your card before then and everything carries on:
${fixUrl}

If you'd rather stop, that's fine too — you can download your whole site any time from the same page.

— GoBeeFound`,
  );
}

export async function sendManagedEnded(to: string, exportUrl: string): Promise<void> {
  await send(
    to,
    "Your website is offline",
    `Managed hosting has ended, so your website is no longer online.

Nothing has been deleted. Your site, every version of it, and all your business details are still in GoBeeFound. You can turn hosting back on, or download the whole site to host anywhere:
${exportUrl}

— GoBeeFound`,
  );
}

/**
 * V4 §H — the contact-form relay. The message is emailed to the business and NOT stored. The visitor's
 * contact goes in the body (and as reply-to when it is an email address) so the owner can answer directly.
 */
export async function sendContactRelay(args: { to: string; businessName: string; name: string; contact: string; message: string }): Promise<boolean> {
  const r = resend();
  if (!r) return false;
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.contact.trim()) ? args.contact.trim() : undefined;
  try {
    await r.emails.send({
      from: FROM,
      to: args.to,
      subject: `New message from ${args.name} — via your website`,
      ...(replyTo ? { replyTo } : {}),
      text: `Someone sent a message through ${args.businessName}'s website.

From: ${args.name}
Reach them at: ${args.contact}

${args.message}

—
Sent through your GoBeeFound-hosted website. This message is not stored by GoBeeFound; reply directly to the person above.`,
    });
    return true;
  } catch (e) {
    console.error("[email] relay failed", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function sendRefundConfirmation(to: string, amountCents: number): Promise<void> {
  await send(
    to,
    "Your GoBeeFound refund",
    `Your ${money(amountCents)} refund is on its way — it usually shows within 5–10 business days.

Nothing you entered has been deleted. Module 1, Your Business, your online assets, and your export all stay available:
${app()}/your-business

If you change your mind later, you can unlock Launch again any time.

— GoBeeFound`,
  );
}
