DO $$
BEGIN
  CREATE TYPE "CustomOrderRequestStatus" AS ENUM ('pending', 'accepted', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CustomOrderRequest" (
  "id" SERIAL NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerPhone" TEXT,
  "desiredItems" TEXT NOT NULL,
  "requestDetails" TEXT NOT NULL,
  "requestedDate" TIMESTAMP(3),
  "fulfillmentPreference" "FulfillmentMethod",
  "budget" TEXT,
  "status" "CustomOrderRequestStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomOrderRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomOrderRequestMessage" (
  "id" SERIAL NOT NULL,
  "customOrderRequestId" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "sentByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomOrderRequestMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomOrderRequestMessage_customOrderRequestId_fkey"
    FOREIGN KEY ("customOrderRequestId")
    REFERENCES "CustomOrderRequest"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'CustomOrderRequest_status_createdAt_idx'
  ) THEN
    CREATE INDEX "CustomOrderRequest_status_createdAt_idx"
      ON "CustomOrderRequest"("status", "createdAt");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'CustomOrderRequestMessage_customOrderRequestId_createdAt_idx'
  ) THEN
    CREATE INDEX "CustomOrderRequestMessage_customOrderRequestId_createdAt_idx"
      ON "CustomOrderRequestMessage"("customOrderRequestId", "createdAt");
  END IF;
END $$;
