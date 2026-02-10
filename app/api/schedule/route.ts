import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getDefaultScheduleConfig,
  normalizeScheduleConfig,
} from "@/lib/fulfillmentSchedule";

export const runtime = "nodejs";

export async function GET() {
  const defaults = getDefaultScheduleConfig();

  const settings = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      fulfillmentSchedule: defaults,
    },
    update: {},
    select: {
      fulfillmentSchedule: true,
    },
  });

  const normalized = normalizeScheduleConfig(settings.fulfillmentSchedule);

  if (!settings.fulfillmentSchedule) {
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: { fulfillmentSchedule: normalized },
    });
  }

  return NextResponse.json({ schedule: normalized });
}

