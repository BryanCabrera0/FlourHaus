CREATE TABLE IF NOT EXISTS "StoreSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "stripeAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'StoreSettings_stripeAccountId_key'
  ) THEN
    CREATE UNIQUE INDEX "StoreSettings_stripeAccountId_key" ON "StoreSettings"("stripeAccountId");
  END IF;
END $$;

INSERT INTO "StoreSettings" ("id")
VALUES (1)
ON CONFLICT ("id") DO NOTHING;
