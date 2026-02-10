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
};

export async function getStoreSettingsSnapshot(
  db: DbClient = prisma,
): Promise<StoreSettingsSnapshot> {
  const defaults = getDefaultScheduleConfig();

  const settings = await db.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, fulfillmentSchedule: defaults },
    update: {},
    select: { stripeAccountId: true, fulfillmentSchedule: true },
  });

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
  };
}

