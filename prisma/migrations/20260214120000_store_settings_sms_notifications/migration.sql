-- StoreSettings: capture owner SMS notification preferences.
-- These fields are used by /admin/settings and order webhook notifications.

ALTER TABLE "StoreSettings"
  ADD COLUMN IF NOT EXISTS "ownerSmsPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerSmsCarrier" TEXT;

