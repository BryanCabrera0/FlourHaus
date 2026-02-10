import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import {
  getDefaultScheduleConfig,
  normalizeScheduleConfig,
  type FulfillmentScheduleConfig,
} from "@/lib/fulfillmentSchedule";

export const runtime = "nodejs";

type PatchBody = {
  schedule?: unknown;
  fulfillmentSchedule?: unknown;
};

function pickScheduleFromBody(body: PatchBody | null): unknown {
  if (!body || typeof body !== "object") {
    return null;
  }
  if ("schedule" in body) return body.schedule;
  if ("fulfillmentSchedule" in body) return body.fulfillmentSchedule;
  return body;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const defaults = getDefaultScheduleConfig();

  const settings = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, fulfillmentSchedule: defaults },
    update: {},
    select: { fulfillmentSchedule: true },
  });

  const schedule = normalizeScheduleConfig(settings.fulfillmentSchedule);

  if (!settings.fulfillmentSchedule) {
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: { fulfillmentSchedule: schedule },
    });
  }

  return NextResponse.json({ schedule });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const scheduleInput = pickScheduleFromBody(
    (await request.json().catch(() => null)) as PatchBody | null,
  );
  if (!scheduleInput) {
    return NextResponse.json({ error: "Missing schedule payload." }, { status: 400 });
  }

  const schedule = normalizeScheduleConfig(scheduleInput) satisfies FulfillmentScheduleConfig;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.storeSettings.findUnique({
        where: { id: 1 },
        select: { fulfillmentSchedule: true },
      });

      const storeSettings = await tx.storeSettings.upsert({
        where: { id: 1 },
        create: { id: 1, fulfillmentSchedule: schedule },
        update: { fulfillmentSchedule: schedule },
        select: { fulfillmentSchedule: true },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "schedule.update",
          entityType: "StoreSettings",
          entityId: 1,
          details: JSON.stringify({
            before: existing?.fulfillmentSchedule ?? null,
            after: schedule,
          }),
          actorEmail: auth.session.email,
        },
      });

      return storeSettings;
    });

    return NextResponse.json({
      schedule: normalizeScheduleConfig(updated.fulfillmentSchedule),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update schedule." },
      { status: 500 },
    );
  }
}

