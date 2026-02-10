import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { FULFILLMENT_METHODS } from "@/lib/types";
import { getStripeClient } from "@/lib/stripe";
import { isValidDateString, isValidTimeSlot } from "@/lib/fulfillmentSchedule";

export const runtime = "nodejs";

function parseFulfillment(value: string | undefined): "pickup" | "delivery" {
  if (value && FULFILLMENT_METHODS.includes(value as "pickup" | "delivery")) {
    return value as "pickup" | "delivery";
  }
  return "pickup";
}

function parseOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripe = getStripeClient();

  if (!webhookSecret || !stripe) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY) or STRIPE_WEBHOOK_SECRET",
      },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const fulfillment = parseFulfillment(session.metadata?.fulfillment);
    const deliveryAddress = parseOptionalText(session.metadata?.deliveryAddress, 240);
    const notes = parseOptionalText(session.metadata?.notes, 500);
    const customOrderRequestIdRaw = parseOptionalText(session.metadata?.customOrderRequestId, 24);
    const customOrderRequestId =
      customOrderRequestIdRaw && /^\d+$/.test(customOrderRequestIdRaw)
        ? Number.parseInt(customOrderRequestIdRaw, 10)
        : null;
    const scheduledDateRaw = parseOptionalText(session.metadata?.scheduledDate, 10);
    const scheduledDate =
      scheduledDateRaw && isValidDateString(scheduledDateRaw) ? scheduledDateRaw : null;
    const scheduledTimeSlotRaw = parseOptionalText(session.metadata?.scheduledTimeSlot, 5);
    const scheduledTimeSlot =
      scheduledTimeSlotRaw && isValidTimeSlot(scheduledTimeSlotRaw)
        ? scheduledTimeSlotRaw
        : null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (!existing) {
        await tx.order.create({
          data: {
            items: session.metadata?.items ?? "[]",
            total: (session.amount_total ?? 0) / 100,
            fulfillment,
            scheduledDate,
            scheduledTimeSlot,
            deliveryAddress,
            stripeSessionId: session.id,
            status: "paid",
            customerName: session.customer_details?.name ?? null,
            customerPhone: session.customer_details?.phone ?? null,
            notes,
          },
        });
      } else {
        await tx.order.update({
          where: { id: existing.id },
          data: {
            items: session.metadata?.items ?? existing.items,
            total: (session.amount_total ?? 0) / 100,
            fulfillment,
            scheduledDate: scheduledDate ?? existing.scheduledDate,
            scheduledTimeSlot: scheduledTimeSlot ?? existing.scheduledTimeSlot,
            deliveryAddress: deliveryAddress ?? existing.deliveryAddress,
            customerName: session.customer_details?.name ?? existing.customerName,
            customerPhone: session.customer_details?.phone ?? existing.customerPhone,
            notes: notes ?? existing.notes,
            status:
              existing.status === "new" || existing.status === "paid"
                ? "paid"
                : existing.status,
          },
        });
      }

      if (customOrderRequestId && Number.isInteger(customOrderRequestId) && customOrderRequestId > 0) {
        await tx.customOrderRequest.updateMany({
          where: { id: customOrderRequestId },
          data: { paymentPaidAt: new Date() },
        });
      }
    });
  }

  return NextResponse.json({ received: true });
}
