import { PrismaClient } from "@prisma/client";

// V4 §A11 — the public role connects with DATABASE_URL_PUBLIC, a Postgres role granted SELECT on
// SitePublication / SiteVersion / CustomDomain and INSERT/UPDATE on ContactRelayCounter ONLY (see
// supabase/rls.sql). Prisma obeys RLS for this normal Postgres role; its role-specific policies expose only
// live publications, their current versions, active domains, and the content-free relay counter. Fails closed.

function runtimeDatabaseUrl(): string | undefined {
  const isPublic = process.env.SITE_ROLE === "public";
  const value = isPublic ? process.env.DATABASE_URL_PUBLIC : process.env.DATABASE_URL;
  if (isPublic && !value) throw new Error("SITE_ROLE=public requires DATABASE_URL_PUBLIC (read-only role). Refusing to start with the app credentials.");
  if (!value) return undefined;

  const url = new URL(value);

  // Supabase's transaction pooler requires Prisma's PgBouncer compatibility
  // mode. Keep each serverless instance's local pool small as a safe default.
  if (url.hostname.endsWith(".pooler.supabase.com")) {
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
  }

  return url.toString();
}

// Singleton — Next.js dev hot-reload would otherwise open a new pool per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const datasourceUrl = runtimeDatabaseUrl();

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
