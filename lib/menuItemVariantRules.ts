import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export const COOKIE_VARIANT_PRESETS = [
  { unitCount: 4, label: "4", sortOrder: 40 },
  { unitCount: 8, label: "8", sortOrder: 80 },
  { unitCount: 12, label: "12", sortOrder: 120 },
] as const;

export function isCookieCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return normalized === "cookies" || normalized === "cookie";
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

type RuleTx = Prisma.TransactionClient;

export async function enforceMenuItemVariantRules(
  tx: RuleTx,
  params: {
    menuItemId: number;
    category: string;
    basePrice: number;
    cookiePackPrices?: Partial<Record<(typeof COOKIE_VARIANT_PRESETS)[number]["unitCount"], number>>;
  },
): Promise<void> {
  const { menuItemId, category, basePrice, cookiePackPrices } = params;

  const existing = await tx.menuItemVariant.findMany({
    where: { menuItemId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  if (!isCookieCategory(category)) {
    if (existing.length > 0) {
      await tx.menuItemVariant.deleteMany({ where: { menuItemId } });
    }
    return;
  }

  const keepIds: number[] = [];

  for (const preset of COOKIE_VARIANT_PRESETS) {
    const overridePriceRaw = cookiePackPrices?.[preset.unitCount];
    const desiredPrice =
      typeof overridePriceRaw === "number" && Number.isFinite(overridePriceRaw) && overridePriceRaw >= 0
        ? roundCurrency(overridePriceRaw)
        : roundCurrency(basePrice * preset.unitCount);
    const candidate = existing.find(
      (variant) =>
        variant.unitCount === preset.unitCount && !keepIds.includes(variant.id),
    );

    if (candidate) {
      keepIds.push(candidate.id);

      const needsUpdate =
        candidate.label !== preset.label ||
        candidate.sortOrder !== preset.sortOrder ||
        candidate.isActive !== true ||
        (overridePriceRaw !== undefined &&
          roundCurrency(candidate.price) !== desiredPrice);

      if (needsUpdate) {
        await tx.menuItemVariant.update({
          where: { id: candidate.id },
          data: {
            label: preset.label,
            unitCount: preset.unitCount,
            ...(overridePriceRaw !== undefined ? { price: desiredPrice } : {}),
            sortOrder: preset.sortOrder,
            isActive: true,
          },
        });
      }
    } else {
      const created = await tx.menuItemVariant.create({
        data: {
          menuItemId,
          label: preset.label,
          unitCount: preset.unitCount,
          price: desiredPrice,
          sortOrder: preset.sortOrder,
          isActive: true,
        },
        select: { id: true },
      });

      keepIds.push(created.id);
    }
  }

  // Remove extras/duplicates so cookie items are offered only as 4/8/12.
  await tx.menuItemVariant.deleteMany({
    where: { menuItemId, id: { notIn: keepIds } },
  });
}

export async function ensureCookieVariantsForActiveMenuItems(
  db: PrismaClient,
): Promise<void> {
  const cookieItems = await db.menuItem.findMany({
    where: {
      isActive: true,
      OR: [
        { category: { equals: "cookies", mode: "insensitive" } },
        { category: { equals: "cookie", mode: "insensitive" } },
      ],
    },
    select: { id: true, category: true, price: true },
    orderBy: [{ id: "asc" }],
  });

  if (cookieItems.length === 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    for (const item of cookieItems) {
      await enforceMenuItemVariantRules(tx, {
        menuItemId: item.id,
        category: item.category,
        basePrice: item.price,
      });
    }
  });
}
