import { PrismaClient } from "@prisma/client";

function runtimeDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL;
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
