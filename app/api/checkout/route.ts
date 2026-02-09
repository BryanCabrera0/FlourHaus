import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { CartItem, FulfillmentMethod } from "../../lib/types";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  notes?: string;
};

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

function getBaseUrl(request: Request): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configuredBaseUrl) {
    try {
      return new URL(configuredBaseUrl).origin;
    } catch {
      // Fall through to request origin.
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return value === "pickup" || value === "delivery";
}

function isCheckoutItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function parseCheckoutRequest(value: unknown): CheckoutRequestBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const body = value as { items?: unknown; fulfillment?: unknown; notes?: unknown };
  if (!Array.isArray(body.items) || !isFulfillmentMethod(body.fulfillment)) {
    return null;
  }

  const items = body.items.filter(isCheckoutItem);
  if (items.length === 0 || items.length !== body.items.length) {
    return null;
  }

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 500)
      : undefined;

  return {
    items,
    fulfillment: body.fulfillment,
    notes,
  };
}

export async function POST(request: Request) {
  const payload = parseCheckoutRequest(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Server misconfiguration: missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const baseUrl = getBaseUrl(request);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: payload.items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      metadata: {
        fulfillment: payload.fulfillment,
        items: JSON.stringify(payload.items),
        ...(payload.notes ? { notes: payload.notes } : {}),
      },
      phone_number_collection: { enabled: true },
      mode: "payment",
      success_url: new URL("/success", baseUrl).toString(),
      cancel_url: new URL("/cart", baseUrl).toString(),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe checkout URL is unavailable" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 502 }
    );
  }
}
