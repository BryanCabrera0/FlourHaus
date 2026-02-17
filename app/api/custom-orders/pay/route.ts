import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { FulfillmentMethod, OrderItem } from "@/lib/types";
import { getStripeClient } from "@/lib/stripe";
import {
  DELIVERY_MAX_DISTANCE_MILES,
  getDeliveryEligibility,
} from "@/lib/delivery";
import {
  isSlotAvailable,
  isValidDateString,
  isValidTimeSlot,
} from "@/lib/fulfillmentSchedule";
import { getStoreSettingsSnapshot } from "@/lib/storeSettings";
import { resolveConnectedStripeAccountId } from "@/lib/stripeConnect";

export const runtime = "nodejs";

type CustomOrderPayBody = {
  token?: unknown;
  scheduledDate?: unknown;
  scheduledTimeSlot?: unknown;
  deliveryAddress?: unknown;
};

type ParsedBody = {
  token: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  deliveryAddress?: string;
};

function parseBody(value: unknown): ParsedBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const body = value as CustomOrderPayBody;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length < 20 || token.length > 200) {
    return null;
  }

  const scheduledDate =
    typeof body.scheduledDate === "string" ? body.scheduledDate.trim() : "";
  const scheduledTimeSlot =
    typeof body.scheduledTimeSlot === "string" ? body.scheduledTimeSlot.trim() : "";

  if (!isValidDateString(scheduledDate) || !isValidTimeSlot(scheduledTimeSlot)) {
    return null;
  }

  const deliveryAddress =
    typeof body.deliveryAddress === "string" && body.deliveryAddress.trim()
      ? body.deliveryAddress.trim().slice(0, 240)
      : undefined;

  return { token, scheduledDate, scheduledTimeSlot, deliveryAddress };
}

function parseFulfillment(value: unknown): FulfillmentMethod {
  return value === "delivery" ? "delivery" : "pickup";
}

function normalizeAmountToCents(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  // Stripe enforces minimum charge amounts depending on currency.
  if (!Number.isInteger(cents) || cents < 50) return null;
  return cents;
}

function normalizeNotes(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

function isTransferCapabilityError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "insufficient_capabilities_for_transfer";
}

export async function POST(request: Request) {
  const payload = parseBody(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ error: "Invalid payment payload." }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)" },
      { status: 500 },
    );
  }

  const customOrder = await prisma.customOrderRequest.findFirst({
    where: { paymentToken: payload.token },
    select: {
      id: true,
      status: true,
      fulfillmentPreference: true,
      desiredItems: true,
      requestDetails: true,
      deliveryAddress: true,
      paymentAmount: true,
      paymentPaidAt: true,
    },
  });

  if (!customOrder) {
    return NextResponse.json({ error: "Invalid or expired payment link." }, { status: 404 });
  }

  if (customOrder.status !== "accepted") {
    return NextResponse.json(
      { error: "This custom order is not ready for payment yet." },
      { status: 400 },
    );
  }

  if (customOrder.paymentPaidAt) {
    return NextResponse.json({ error: "This custom order has already been paid." }, { status: 400 });
  }

  const paymentAmount = typeof customOrder.paymentAmount === "number" ? customOrder.paymentAmount : null;
  if (paymentAmount === null) {
    return NextResponse.json(
      { error: "This custom order is missing a payment amount. Please contact the bakery." },
      { status: 400 },
    );
  }

  const unitAmount = normalizeAmountToCents(paymentAmount);
  if (!unitAmount) {
    return NextResponse.json(
      { error: "This custom order payment amount is invalid. Please contact the bakery." },
      { status: 400 },
    );
  }

  const fulfillment = parseFulfillment(customOrder.fulfillmentPreference);

  try {
    const storeSettings = await getStoreSettingsSnapshot(prisma);

    if (!isSlotAvailable(storeSettings.schedule, fulfillment, payload.scheduledDate, payload.scheduledTimeSlot)) {
      return NextResponse.json(
        { error: "That date/time slot is not available. Please choose another." },
        { status: 400 },
      );
    }

    let deliveryAddress: string | undefined;
    if (fulfillment === "delivery") {
      deliveryAddress =
        (payload.deliveryAddress ?? customOrder.deliveryAddress ?? "").trim().slice(0, 240) || undefined;

      if (!deliveryAddress) {
        return NextResponse.json(
          { error: "Delivery address is required for delivery orders." },
          { status: 400 },
        );
      }

      const eligibility = await getDeliveryEligibility(deliveryAddress);
      if (!eligibility.ok) {
        return NextResponse.json({ error: eligibility.error }, { status: 400 });
      }
      if (!eligibility.eligible) {
        return NextResponse.json(
          {
            error: `Delivery is available within ${DELIVERY_MAX_DISTANCE_MILES} miles of the 33185 area. Your address is about ${eligibility.distanceMiles} miles away.`,
          },
          { status: 400 },
        );
      }
    }

    const connectedAccountId = await resolveConnectedStripeAccountId(
      stripe,
      storeSettings.stripeAccountId,
    );
    const item: OrderItem = {
      id: customOrder.id,
      name: `Custom Order #${customOrder.id}`,
      price: paymentAmount,
      quantity: 1,
    };

    const notes = normalizeNotes(`Custom order details: ${customOrder.desiredItems}\n${customOrder.requestDetails}`);

    const createSession = (routeToConnectedAccount: boolean) =>
      stripe.checkout.sessions.create({
        ui_mode: "embedded",
        redirect_on_completion: "never",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        ...(routeToConnectedAccount && connectedAccountId
          ? {
              payment_intent_data: {
                on_behalf_of: connectedAccountId,
                transfer_data: { destination: connectedAccountId },
              },
            }
          : {}),
        metadata: {
          fulfillment,
          items: JSON.stringify([item]),
          customOrderRequestId: String(customOrder.id),
          scheduledDate: payload.scheduledDate,
          scheduledTimeSlot: payload.scheduledTimeSlot,
          payoutRoutingMode:
            routeToConnectedAccount && connectedAccountId
              ? "connected_destination"
              : "platform_fallback",
          ...(deliveryAddress ? { deliveryAddress } : {}),
          ...(notes ? { notes } : {}),
        },
        phone_number_collection: { enabled: true },
        mode: "payment",
      });

    let session;
    let usedFallbackRouting = connectedAccountId === null;
    try {
      session = await createSession(!usedFallbackRouting);
    } catch (error) {
      if (connectedAccountId && isTransferCapabilityError(error)) {
        usedFallbackRouting = true;
        session = await createSession(false);
      } else {
        throw error;
      }
    }

    if (usedFallbackRouting) {
      await prisma.adminAuditLog
        .create({
          data: {
            action: "custom-order.payout.fallback",
            entityType: "StoreSettings",
            entityId: 1,
            details: JSON.stringify({
              stripeAccountId: storeSettings.stripeAccountId,
              reason: connectedAccountId
                ? "transfer_capability_unavailable"
                : "connected_account_missing_or_inactive",
              customOrderRequestId: customOrder.id,
            }),
            actorEmail: "system",
          },
        })
        .catch(() => null);
    }

    if (!session.client_secret) {
      return NextResponse.json({ error: "Stripe client secret is unavailable." }, { status: 502 });
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Stripe custom order payment session creation failed", error);
    return NextResponse.json({ error: "Unable to create payment session." }, { status: 502 });
  }
}
