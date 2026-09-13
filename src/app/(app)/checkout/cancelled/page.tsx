import { redirect } from "next/navigation";

// §18.3 — cancelling checkout returns the owner to where they were, with no state change.
export default async function CheckoutCancelledPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  redirect(from && from.startsWith("/") && !from.startsWith("//") ? from : "/home");
}
