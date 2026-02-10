import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FULFILLMENT_METHODS, type FulfillmentMethod } from "@/lib/types";
import { isEmailSendingConfigured, sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";

type CreateCustomOrderBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  desiredItems?: unknown;
  details?: unknown;
  requestedDate?: unknown;
  fulfillmentPreference?: unknown;
  budget?: unknown;
};

type ParsedBody = {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  desiredItems: string;
  requestDetails: string;
  requestedDate: Date | null;
  fulfillmentPreference: FulfillmentMethod;
  budget: string | null;
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseOptionalText(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > maxLength) {
    return undefined;
  }
  return trimmed;
}

function parseOptionalRequestedDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function parseRequiredFulfillment(value: unknown): FulfillmentMethod | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return FULFILLMENT_METHODS.includes(normalized as FulfillmentMethod)
    ? (normalized as FulfillmentMethod)
    : undefined;
}

function parseBody(body: CreateCustomOrderBody | null): ParsedBody | null {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const desiredItems =
    typeof body?.desiredItems === "string" ? body.desiredItems.trim() : "";
  const details = typeof body?.details === "string" ? body.details.trim() : "";

  if (
    name.length < 2 ||
    name.length > 120 ||
    !isEmail(email) ||
    desiredItems.length < 2 ||
    desiredItems.length > 240 ||
    details.length < 10 ||
    details.length > 2500
  ) {
    return null;
  }

  const customerPhone = parseOptionalText(body?.phone, 40);
  const budget = parseOptionalText(body?.budget, 120);
  const requestedDate = parseOptionalRequestedDate(body?.requestedDate);
  const fulfillmentPreference = parseRequiredFulfillment(body?.fulfillmentPreference);

  if (
    customerPhone === undefined ||
    budget === undefined ||
    requestedDate === undefined ||
    fulfillmentPreference === undefined
  ) {
    return null;
  }

  return {
    customerName: name,
    customerEmail: email,
    customerPhone,
    desiredItems,
    requestDetails: details,
    requestedDate,
    fulfillmentPreference,
    budget,
  };
}

function formatOwnerNotificationText(payload: ParsedBody & { id: number }) {
  return [
    `A new custom order request was submitted.`,
    "",
    `Request ID: #${payload.id}`,
    `Name: ${payload.customerName}`,
    `Email: ${payload.customerEmail}`,
    `Phone: ${payload.customerPhone ?? "Not provided"}`,
    `Desired Items: ${payload.desiredItems}`,
    `Requested Date: ${payload.requestedDate ? payload.requestedDate.toISOString().slice(0, 10) : "Not specified"}`,
    `Fulfillment: ${payload.fulfillmentPreference}`,
    `Budget: ${payload.budget ?? "Not specified"}`,
    "",
    "Customer Notes:",
    payload.requestDetails,
  ].join("\n");
}

export async function POST(request: Request) {
  const parsedBody = parseBody(
    (await request.json().catch(() => null)) as CreateCustomOrderBody | null
  );
  if (!parsedBody) {
    return NextResponse.json(
      {
        error:
          "Invalid request. Include name, email, fulfillment method, requested item summary, and request details.",
      },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.customOrderRequest.create({
      data: parsedBody,
      select: {
        id: true,
      },
    });

    const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (ownerEmail && isEmailSendingConfigured()) {
      const subject = `New custom order request #${created.id} from ${parsedBody.customerName}`;
      const text = formatOwnerNotificationText({
        ...parsedBody,
        id: created.id,
      });
      await sendTransactionalEmail({
        to: ownerEmail,
        subject,
        text,
      });
    }

    return NextResponse.json({ requestId: created.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit custom order request." },
      { status: 500 }
    );
  }
}
