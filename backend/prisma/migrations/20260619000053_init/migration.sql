-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEDIA', 'DEVELOPER', 'READONLY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('GOOGLE_MERCHANT', 'VTEX');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'DISAPPROVED', 'PENDING', 'EXPIRING');

-- CreateEnum
CREATE TYPE "DestinationStatus" AS ENUM ('APPROVED', 'DISAPPROVED', 'PENDING', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('RED', 'ORANGE', 'YELLOW');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SyncTriggeredBy" AS ENUM ('SCHEDULER', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PriorityReason" AS ENUM ('HIGH_REVENUE', 'CAMPAIGN_ACTIVE', 'BESTSELLER', 'STRATEGIC', 'HIGH_MARGIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READONLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "platform" VARCHAR(20) NOT NULL DEFAULT 'VTEX',
    "vtex_account" VARCHAR(100) NOT NULL,
    "merchant_id" VARCHAR(50) NOT NULL,
    "store_url" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'PENDING',
    "integration_status" JSONB,
    "media_owner_id" UUID,
    "dev_owner_id" UUID,
    "notes" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "notification_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vtex_skus" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "sku_id" VARCHAR(50) NOT NULL,
    "product_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "brand" VARCHAR(200),
    "category" VARCHAR(300),
    "price" DECIMAL(12,2),
    "list_price" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "gtin" VARCHAR(50),
    "image_url" TEXT,
    "product_url" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vtex_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_products" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "offer_id" VARCHAR(200) NOT NULL,
    "google_product_id" VARCHAR(200),
    "title" VARCHAR(500),
    "approval_status" "ApprovalStatus" NOT NULL,
    "shopping_ads_status" "DestinationStatus" NOT NULL,
    "free_listings_status" "DestinationStatus" NOT NULL,
    "issues" JSONB,
    "destination_statuses" JSONB,
    "google_created_at" TIMESTAMP(3),
    "google_updated_at" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "collected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_health_snapshots" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_vtex_skus" INTEGER NOT NULL DEFAULT 0,
    "total_merchant_skus" INTEGER NOT NULL DEFAULT 0,
    "approved_skus" INTEGER NOT NULL DEFAULT 0,
    "disapproved_skus" INTEGER NOT NULL DEFAULT 0,
    "pending_skus" INTEGER NOT NULL DEFAULT 0,
    "expired_skus" INTEGER NOT NULL DEFAULT 0,
    "missing_skus" INTEGER NOT NULL DEFAULT 0,
    "delta_approved" INTEGER,
    "delta_approved_pct" DECIMAL(5,2),
    "health_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "affected_skus_count" INTEGER NOT NULL DEFAULT 0,
    "main_causes" JSONB,
    "rule_code" VARCHAR(100),
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_comments" (
    "id" UUID NOT NULL,
    "alert_id" UUID NOT NULL,
    "user_id" UUID,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "triggered_by" "SyncTriggeredBy" NOT NULL,
    "triggered_by_user_id" UUID,
    "status" "SyncStatus" NOT NULL,
    "vtex_skus_collected" INTEGER,
    "merchant_products_collected" INTEGER,
    "alerts_generated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_sku_priorities" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "sku_id" VARCHAR(50) NOT NULL,
    "priority_reason" "PriorityReason" NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_sku_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_vtex_account_key" ON "clients"("vtex_account");

-- CreateIndex
CREATE UNIQUE INDEX "clients_merchant_id_key" ON "clients"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_client_id_type_key" ON "integrations"("client_id", "type");

-- CreateIndex
CREATE INDEX "vtex_skus_client_id_idx" ON "vtex_skus"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "vtex_skus_client_id_sku_id_key" ON "vtex_skus"("client_id", "sku_id");

-- CreateIndex
CREATE INDEX "merchant_products_client_id_idx" ON "merchant_products"("client_id");

-- CreateIndex
CREATE INDEX "sku_health_snapshots_client_id_idx" ON "sku_health_snapshots"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "sku_health_snapshots_client_id_snapshot_date_key" ON "sku_health_snapshots"("client_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "alerts_client_id_idx" ON "alerts"("client_id");

-- CreateIndex
CREATE INDEX "sync_logs_client_id_idx" ON "sync_logs"("client_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_media_owner_id_fkey" FOREIGN KEY ("media_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_dev_owner_id_fkey" FOREIGN KEY ("dev_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vtex_skus" ADD CONSTRAINT "vtex_skus_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_products" ADD CONSTRAINT "merchant_products_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_health_snapshots" ADD CONSTRAINT "sku_health_snapshots_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_comments" ADD CONSTRAINT "alert_comments_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_comments" ADD CONSTRAINT "alert_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sku_priorities" ADD CONSTRAINT "client_sku_priorities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sku_priorities" ADD CONSTRAINT "client_sku_priorities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
