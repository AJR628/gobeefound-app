import { SuccessPoller } from "./poller";

// §18.3 — never grant entitlement from the return URL. Poll the server every 2s for up to 60s.
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const dest = from && from.startsWith("/") && !from.startsWith("//") ? from : "/home";
  return <SuccessPoller destination={dest} />;
}
