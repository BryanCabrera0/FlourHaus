-- Custom order payments (payment link token + amount) + capture delivery address separately.

ALTER TABLE "CustomOrderRequest"
  ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentToken" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "paymentCreatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentPaidAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'CustomOrderRequest_paymentToken_key'
  ) THEN
    CREATE UNIQUE INDEX "CustomOrderRequest_paymentToken_key"
      ON "CustomOrderRequest"("paymentToken");
  END IF;
END $$;

