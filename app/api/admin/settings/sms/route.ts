import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import {
  isSmsSendingConfigured,
  isValidCarrier,
  sendSms,
  SMS_CARRIERS,
} from "@/lib/sms";

export const runtime = "nodejs";

const US_PHONE_REGEX = /^\d{10}$/;

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { id: 1 },
    select: { ownerSmsPhone: true, ownerSmsCarrier: true },
  });

  return NextResponse.json({
    ownerSmsPhone: settings?.ownerSmsPhone ?? null,
    ownerSmsCarrier: settings?.ownerSmsCarrier ?? null,
    emailConfigured: isSmsSendingConfigured(),
    carriers: Object.entries(SMS_CARRIERS).map(([key, { label }]) => ({
      key,
      label,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    ownerSmsPhone?: string | null;
    ownerSmsCarrier?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawPhone =
    typeof body.ownerSmsPhone === "string"
      ? body.ownerSmsPhone.replace(/\D/g, "")
      : null;

  const ownerSmsPhone = rawPhone || null;

  const rawCarrier =
    typeof body.ownerSmsCarrier === "string"
      ? body.ownerSmsCarrier.trim()
      : null;

  const ownerSmsCarrier = rawCarrier || null;

  // If setting a phone, require a valid 10-digit number and carrier
  if (ownerSmsPhone) {
    if (!US_PHONE_REGEX.test(ownerSmsPhone)) {
      return NextResponse.json(
        { error: "Enter a 10-digit US phone number (e.g. 5551234567)." },
        { status: 400 },
      );
    }
    if (!ownerSmsCarrier || !isValidCarrier(ownerSmsCarrier)) {
      return NextResponse.json(
        { error: "Select your phone carrier." },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.storeSettings.findUnique({
        where: { id: 1 },
        select: { ownerSmsPhone: true, ownerSmsCarrier: true },
      });

      const storeSettings = await tx.storeSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ownerSmsPhone, ownerSmsCarrier },
        update: { ownerSmsPhone, ownerSmsCarrier },
        select: { ownerSmsPhone: true, ownerSmsCarrier: true },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "settings.sms.update",
          entityType: "StoreSettings",
          entityId: 1,
          details: JSON.stringify({
            before: {
              phone: existing?.ownerSmsPhone ?? null,
              carrier: existing?.ownerSmsCarrier ?? null,
            },
            after: {
              phone: ownerSmsPhone,
              carrier: ownerSmsCarrier,
            },
          }),
          actorEmail: auth.session.email,
        },
      });

      return storeSettings;
    });

    return NextResponse.json({
      ownerSmsPhone: updated.ownerSmsPhone,
      ownerSmsCarrier: updated.ownerSmsCarrier,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update SMS settings." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isSmsSendingConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable SMS notifications.",
      },
      { status: 400 },
    );
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { id: 1 },
    select: { ownerSmsPhone: true, ownerSmsCarrier: true },
  });

  const phone = settings?.ownerSmsPhone?.trim();
  const carrier = settings?.ownerSmsCarrier?.trim();

  if (!phone || !carrier) {
    return NextResponse.json(
      { error: "Save a phone number and carrier first." },
      { status: 400 },
    );
  }

  const result = await sendSms({
    phone,
    carrier,
    body: "Flour Haus SMS notifications are working!",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
