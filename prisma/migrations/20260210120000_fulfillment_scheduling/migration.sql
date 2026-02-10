-- Store fulfillment scheduling settings + capture selected pickup/delivery time on orders.

ALTER TABLE "StoreSettings"
  ADD COLUMN IF NOT EXISTS "fulfillmentSchedule" JSONB;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "scheduledDate" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledTimeSlot" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
