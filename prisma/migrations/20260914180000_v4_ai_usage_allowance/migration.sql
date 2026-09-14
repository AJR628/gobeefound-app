-- CreateEnum
CREATE TYPE "AiOperationClass" AS ENUM ('website_copy', 'descriptions', 'review_requests', 'section_rewrite', 'seo_meta', 'gbp_asset', 'site_draft', 'logo_image');

-- CreateEnum
CREATE TYPE "AiBucket" AS ENUM ('builds', 'edits', 'logos', 'managed_edits');

-- CreateEnum
CREATE TYPE "AiUsageOutcome" AS ENUM ('pending', 'ok', 'claims_rejected', 'contact_rejected', 'error');

-- CreateEnum
CREATE TYPE "AiAllowanceSource" AS ENUM ('launch_grant', 'operator', 'managed_period', 'purchase');

-- AlterTable
ALTER TABLE "GeneratedContent" ADD COLUMN     "aiUsageId" UUID,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "promptVersion" TEXT;

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operation" "AiOperationClass" NOT NULL,
    "bucket" "AiBucket" NOT NULL,
    "outcome" "AiUsageOutcome" NOT NULL DEFAULT 'pending',
    "errorKind" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "estimatedCostMicros" INTEGER,
    "durationMs" INTEGER,
    "attempts" INTEGER,
    "providerRequestId" TEXT,
    "platformRequestId" TEXT,
    "generatedContentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAllowance" (
    "businessId" UUID NOT NULL,
    "buildsLimit" INTEGER NOT NULL DEFAULT 5,
    "buildsUsed" INTEGER NOT NULL DEFAULT 0,
    "editsLimit" INTEGER NOT NULL DEFAULT 40,
    "editsUsed" INTEGER NOT NULL DEFAULT 0,
    "logosLimit" INTEGER NOT NULL DEFAULT 3,
    "logosUsed" INTEGER NOT NULL DEFAULT 0,
    "managedEditsLimit" INTEGER NOT NULL DEFAULT 10,
    "managedEditsUsed" INTEGER NOT NULL DEFAULT 0,
    "managedPeriodStart" TIMESTAMP(3),
    "hourlyLimit" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAllowance_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "AiAllowanceAdjustment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "bucket" "AiBucket" NOT NULL,
    "delta" INTEGER NOT NULL,
    "source" "AiAllowanceSource" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAllowanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_generationId_key" ON "AiUsage"("generationId");

-- CreateIndex
CREATE INDEX "AiUsage_businessId_createdAt_idx" ON "AiUsage"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_businessId_idempotencyKey_key" ON "AiUsage"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AiAllowanceAdjustment_businessId_createdAt_idx" ON "AiAllowanceAdjustment"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedContent_businessId_createdAt_idx" ON "GeneratedContent"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAllowanceAdjustment" ADD CONSTRAINT "AiAllowanceAdjustment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAllowanceAdjustment" ADD CONSTRAINT "AiAllowanceAdjustment_allowance_fkey" FOREIGN KEY ("businessId") REFERENCES "AiAllowance"("businessId") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- Hand-authored additions (V4 §E). Prisma does not model CHECK constraints; these make "used never
-- exceeds limit" a database fact, not just an application promise.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_builds_within_limit" CHECK ("buildsUsed" >= 0 AND "buildsUsed" <= "buildsLimit");
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_edits_within_limit" CHECK ("editsUsed" >= 0 AND "editsUsed" <= "editsLimit");
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_logos_within_limit" CHECK ("logosUsed" >= 0 AND "logosUsed" <= "logosLimit");
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_managed_within_limit" CHECK ("managedEditsUsed" >= 0 AND "managedEditsUsed" <= "managedEditsLimit");
ALTER TABLE "AiAllowance" ADD CONSTRAINT "AiAllowance_limits_nonnegative" CHECK ("buildsLimit" >= 0 AND "editsLimit" >= 0 AND "logosLimit" >= 0 AND "managedEditsLimit" >= 0 AND "hourlyLimit" >= 0);

-- Backfill: every business whose owner already paid for Launch gets the default allowance row now, so no
-- paying customer hits a fail-closed "no allowance" on first use. (The app also upserts on first use.)
INSERT INTO "AiAllowance" ("businessId", "createdAt", "updatedAt")
SELECT b."id", now(), now()
  FROM "Business" b
  JOIN "Purchase" p ON p."userId" = b."ownerId" AND p."status" = 'paid'
ON CONFLICT ("businessId") DO NOTHING;
