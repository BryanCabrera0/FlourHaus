import "server-only";

import prisma from "@/lib/prisma";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import {
  getDefaultScheduleConfig,
  normalizeScheduleConfig,
  type FulfillmentScheduleConfig,
} from "@/lib/fulfillmentSchedule";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type StoreSettingsSnapshot = {
  stripeAccountId: string | null;
  schedule: FulfillmentScheduleConfig;
  ownerSmsPhone: string | null;
  ownerSmsCarrier: string | null;
};

export async function getStoreSettingsSnapshot(
  db: DbClient = prisma,
): Promise<StoreSettingsSnapshot> {
  const defaults = getDefaultScheduleConfig();

  const select = { stripeAccountId: true, fulfillmentSchedule: true, ownerSmsPhone: true, ownerSmsCarrier: true } as const;

  const settings =
    (await db.storeSettings.findUnique({
      where: { id: 1 },
      select,
    })) ??
    (await (async () => {
      try {
        return await db.storeSettings.create({
          data: { id: 1, fulfillmentSchedule: defaults },
          select,
        });
      } catch {
        // Another request likely created the row at the same time.
        const existing = await db.storeSettings.findUnique({ where: { id: 1 }, select });
        if (existing) return existing;
        throw new Error("Failed to initialize store settings.");
      }
    })());

  const schedule = normalizeScheduleConfig(settings.fulfillmentSchedule);

  if (!settings.fulfillmentSchedule) {
    await db.storeSettings.update({
      where: { id: 1 },
      data: { fulfillmentSchedule: schedule },
      select: { id: true },
    });
  }

  return {
    stripeAccountId:
      typeof settings.stripeAccountId === "string" && settings.stripeAccountId.trim()
        ? settings.stripeAccountId.trim()
        : null,
    schedule,
    ownerSmsPhone:
      typeof settings.ownerSmsPhone === "string" && settings.ownerSmsPhone.trim()
        ? settings.ownerSmsPhone.trim()
        : null,
    ownerSmsCarrier:
      typeof settings.ownerSmsCarrier === "string" && settings.ownerSmsCarrier.trim()
        ? settings.ownerSmsCarrier.trim()
        : null,
  };
}
