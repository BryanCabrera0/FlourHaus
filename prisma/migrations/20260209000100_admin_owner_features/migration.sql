-- Create fulfillment and status enums.
DO $$
BEGIN
  CREATE TYPE "FulfillmentMethod" AS ENUM ('pickup', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('new', 'paid', 'baking', 'ready', 'completed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Menu item admin-management fields.
ALTER TABLE "MenuItem"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Order workflow and customer fields.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "customerName" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert text fulfillment/status to enums with safe defaults.
ALTER TABLE "Order"
  ALTER COLUMN "fulfillment" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "fulfillment" TYPE "FulfillmentMethod"
  USING (
    CASE
      WHEN "fulfillment"::text = 'delivery' THEN 'delivery'::"FulfillmentMethod"
      ELSE 'pickup'::"FulfillmentMethod"
    END
  );

ALTER TABLE "Order"
  ALTER COLUMN "fulfillment" SET DEFAULT 'pickup'::"FulfillmentMethod";

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus"
  USING (
    CASE
      WHEN "status"::text IN ('new', 'paid', 'baking', 'ready', 'completed', 'canceled')
        THEN "status"::text::"OrderStatus"
      ELSE 'new'::"OrderStatus"
    END
  );

ALTER TABLE "Order"
  ALTER COLUMN "status" SET DEFAULT 'new'::"OrderStatus";

-- Create unique index for Stripe webhook idempotency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Order_stripeSessionId_key'
  ) THEN
    CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
  END IF;
END $$;

-- Audit log table for owner/admin actions.
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" SERIAL NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" INTEGER,
  "details" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
