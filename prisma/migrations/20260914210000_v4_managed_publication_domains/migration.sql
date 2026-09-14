-- CreateEnum
CREATE TYPE "ManagedProduct" AS ENUM ('managed_website');

-- CreateEnum
CREATE TYPE "ManagedStatus" AS ENUM ('incomplete', 'active', 'past_due', 'cancel_at_period_end', 'canceled', 'ended');

-- CreateEnum
CREATE TYPE "DomainState" AS ENUM ('pending', 'dns_verified', 'active', 'failed', 'removed');

-- CreateEnum
CREATE TYPE "DomainProvider" AS ENUM ('netlify_alias', 'cloudflare_saas');

-- CreateTable
CREATE TABLE "SitePublication" (
    "businessId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "currentVersionId" UUID,
    "assets" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePublication_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "ManagedSubscription" (
    "businessId" UUID NOT NULL,
    "userId" UUID,
    "product" "ManagedProduct" NOT NULL DEFAULT 'managed_website',
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" "ManagedStatus" NOT NULL DEFAULT 'incomplete',
    "currentPeriodEnd" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedSubscription_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "CustomDomain" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" "DomainProvider" NOT NULL DEFAULT 'netlify_alias',
    "providerRef" TEXT,
    "state" "DomainState" NOT NULL DEFAULT 'pending',
    "verificationToken" TEXT NOT NULL,
    "dnsProvider" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "mxSeenAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "activeAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRelayCounter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRelayCounter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SitePublication_slug_key" ON "SitePublication"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SitePublication_currentVersionId_key" ON "SitePublication"("currentVersionId");

-- CreateIndex
CREATE INDEX "SitePublication_slug_idx" ON "SitePublication"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedSubscription_stripeSubscriptionId_key" ON "ManagedSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_domain_key" ON "CustomDomain"("domain");

-- CreateIndex
CREATE INDEX "CustomDomain_businessId_idx" ON "CustomDomain"("businessId");

-- CreateIndex
CREATE INDEX "ContactRelayCounter_expiresAt_idx" ON "ContactRelayCounter"("expiresAt");

-- AddForeignKey
ALTER TABLE "SitePublication" ADD CONSTRAINT "SitePublication_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitePublication" ADD CONSTRAINT "SitePublication_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "SiteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedSubscription" ADD CONSTRAINT "ManagedSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

