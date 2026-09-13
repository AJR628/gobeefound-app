-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email', 'google');

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('handyman', 'cleaning', 'landscaping', 'licensed_trade', 'mobile_service', 'beauty', 'photography', 'food', 'pet_services', 'other');

-- CreateEnum
CREATE TYPE "ServiceAreaType" AS ENUM ('atCustomer', 'atMyLocation', 'both');

-- CreateEnum
CREATE TYPE "BusinessStage" AS ENUM ('launching', 'launched');

-- CreateEnum
CREATE TYPE "YesNoUnsure" AS ENUM ('yes', 'no', 'unsure');

-- CreateEnum
CREATE TYPE "PreferredContact" AS ENUM ('call', 'text', 'form', 'any');

-- CreateEnum
CREATE TYPE "ProvenanceSource" AS ENUM ('owner_entered', 'generated_approved');

-- CreateEnum
CREATE TYPE "ConfirmedVia" AS ENUM ('task_completion', 'baseline_confirmation', 'manual_recheck');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('website', 'gbp', 'facebook', 'instagram', 'booking', 'other');

-- CreateEnum
CREATE TYPE "ConnectionState" AS ENUM ('declared', 'owner_verified', 'connected');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('not_started', 'saved_for_later', 'complete', 'skipped', 'awaiting_verification');

-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('already_done', 'not_doing', 'later');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('website_copy', 'descriptions', 'review_requests');

-- CreateEnum
CREATE TYPE "DecisionContext" AS ENUM ('task_skip', 'generator_edit', 'service_offer', 'confirmation');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('accepted', 'rejected', 'deferred', 'ignored');

-- CreateEnum
CREATE TYPE "Product" AS ENUM ('launch');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pending', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "ServicePlacement" AS ENUM ('task_3_1', 'task_3_4', 'home_footer', 'your_business_footer');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('website_build');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "authProvider" "AuthProvider" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "trade" "Trade" NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "serviceAreaType" "ServiceAreaType" NOT NULL,
    "alreadyServing" BOOLEAN NOT NULL,
    "stage" "BusinessStage" NOT NULL DEFAULT 'launching',
    "launchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingAnswers" (
    "businessId" UUID NOT NULL,
    "hasDomain" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasWebsite" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasEmail" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasPhone" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasGBP" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasSocial" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "hasReviews" "YesNoUnsure" NOT NULL DEFAULT 'unsure',
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingAnswers_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "businessId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "streetAddress" TEXT,
    "hideAddress" BOOLEAN NOT NULL DEFAULT false,
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "hours" JSONB,
    "timezone" TEXT,
    "services" JSONB NOT NULL DEFAULT '[]',
    "pricingApproach" TEXT,
    "idealCustomer" TEXT,
    "differentiators" JSONB,
    "logoUrl" TEXT,
    "brandColors" JSONB,
    "shortDescription" TEXT,
    "gbpDescription" TEXT,
    "longDescription" TEXT,
    "domain" TEXT,
    "pageTitle" TEXT,
    "metaDescription" TEXT,
    "reviewLink" TEXT,
    "preferredContact" "PreferredContact",
    "responseCommitment" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "FieldProvenance" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "source" "ProvenanceSource" NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConfirmedAt" TIMESTAMP(3),
    "confirmedVia" "ConfirmedVia",

    CONSTRAINT "FieldProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAsset" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "connectionState" "ConnectionState" NOT NULL DEFAULT 'declared',
    "verifiedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskState" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'not_started',
    "skipReason" "SkipReason",
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "toolType" "ToolType" NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "editedOutput" JSONB,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "context" "DecisionContext" NOT NULL,
    "contextId" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "product" "Product" NOT NULL DEFAULT 'launch',
    "amountCents" INTEGER NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'pending',
    "creditExpiresAt" TIMESTAMP(3),
    "creditRedeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLead" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "placement" "ServicePlacement" NOT NULL,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'website_build',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Business_ownerId_key" ON "Business"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProvenance_businessId_fieldKey_key" ON "FieldProvenance"("businessId", "fieldKey");

-- CreateIndex
CREATE INDEX "ConnectedAsset_businessId_type_idx" ON "ConnectedAsset"("businessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TaskState_businessId_taskId_key" ON "TaskState"("businessId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripeSessionId_key" ON "Purchase"("stripeSessionId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingAnswers" ADD CONSTRAINT "OnboardingAnswers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProvenance" ADD CONSTRAINT "FieldProvenance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAsset" ADD CONSTRAINT "ConnectedAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskState" ADD CONSTRAINT "TaskState_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLead" ADD CONSTRAINT "ServiceLead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

