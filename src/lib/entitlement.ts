import { cache } from "react";
import { db } from "./db";

export type Entitlement = "free" | "launch";

/**
 * §14 / §17.1 — entitlement is DERIVED, never stored.
 * A user has `launch` if any Purchase row with status = paid exists. A refund flips status,
 * so revocation needs no second write. Cached per request.
 */
export const getEntitlement = cache(async (userId: string): Promise<Entitlement> => {
  const paid = await db.purchase.findFirst({ where: { userId, status: "paid" }, select: { id: true } });
  return paid ? "launch" : "free";
});

export async function requireLaunchEntitlement(userId: string): Promise<boolean> {
  return (await getEntitlement(userId)) === "launch";
}
