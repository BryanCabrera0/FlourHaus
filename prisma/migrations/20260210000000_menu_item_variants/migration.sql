-- Create variants/presets for menu items (ex: cookie packs of 4/8/12).

CREATE TABLE IF NOT EXISTS "MenuItemVariant" (
  "id" SERIAL NOT NULL,
  "menuItemId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "unitCount" INTEGER NOT NULL DEFAULT 1,
  "price" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuItemVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuItemVariant_menuItemId_fkey"
    FOREIGN KEY ("menuItemId")
    REFERENCES "MenuItem"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'MenuItemVariant_menuItemId_sortOrder_idx'
  ) THEN
    CREATE INDEX "MenuItemVariant_menuItemId_sortOrder_idx"
      ON "MenuItemVariant"("menuItemId", "sortOrder", "id");
  END IF;
END $$;
