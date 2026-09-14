-- AlterEnum
ALTER TYPE "ServicePlacement" ADD VALUE 'builder_entry';

-- CreateTable
CREATE TABLE "SiteDraft" (
    "businessId" UUID NOT NULL,
    "spec" JSONB NOT NULL,
    "lastBuiltAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDraft_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "SiteVersion" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "spec" JSONB NOT NULL,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVersion_businessId_createdAt_idx" ON "SiteVersion"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVersion_businessId_versionNumber_key" ON "SiteVersion"("businessId", "versionNumber");

-- AddForeignKey
ALTER TABLE "SiteDraft" ADD CONSTRAINT "SiteDraft_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVersion" ADD CONSTRAINT "SiteVersion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

