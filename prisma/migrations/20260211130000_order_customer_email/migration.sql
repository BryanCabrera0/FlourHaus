-- Capture customer email on completed Stripe Checkout sessions so we can send
-- status notifications (ex: pickup ready).

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;

