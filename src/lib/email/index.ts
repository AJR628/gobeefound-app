// §16.5 — exactly four transactional emails. Welcome, receipt, and refund go through Resend.
// Password reset is sent by Supabase Auth (configure Supabase SMTP to use Resend — no code here).
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
