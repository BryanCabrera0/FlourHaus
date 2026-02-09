import { NextResponse } from "next/server";
import type { CartItem, FulfillmentMethod } from "@/lib/types";
import { getBaseUrl, getStripeClient } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  items: Array<Pick<CartItem, "id" | "quantity">>;
  fulfillment: FulfillmentMethod;
  notes?: string;
};

function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return value === "pickup" || value === "delivery";
}

function isCheckoutItem(value: unknown): value is Pick<CartItem, "id" | "quantity"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
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

function buildItemUnavailableMessage(count: number): string {
  if (count <= 1) {
    return "One of the items in your cart is unavailable. Please refresh the menu and try again.";
  }
  return `${count} items in your cart are unavailable. Please refresh the menu and try again.`;
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
    // Never trust cart prices coming from the client. Always look up the latest menu item
    // details from the database to prevent price tampering.
    const quantitiesById = new Map<number, number>();
    const orderedIds: number[] = [];
    for (const item of payload.items) {
      if (!quantitiesById.has(item.id)) {
        orderedIds.push(item.id);
      }
      quantitiesById.set(item.id, (quantitiesById.get(item.id) ?? 0) + item.quantity);
    }

    if (orderedIds.length === 0) {
      return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: orderedIds }, isActive: true },
      select: { id: true, name: true, price: true },
    });

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const unavailableIds = orderedIds.filter((id) => !menuById.has(id));
    if (unavailableIds.length > 0) {
      return NextResponse.json(
        { error: buildItemUnavailableMessage(unavailableIds.length) },
        { status: 400 },
      );
    }

    const normalizedItems = orderedIds.map((id) => {
      const menuItem = menuById.get(id)!;
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantitiesById.get(id)!,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: normalizedItems.map((item) => ({
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
        items: JSON.stringify(normalizedItems),
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
