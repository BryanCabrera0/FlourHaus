import { NextResponse } from "next/server";
import type { FulfillmentMethod } from "@/lib/types";
import { getBaseUrl, getStripeClient } from "@/lib/stripe";
import {
  DELIVERY_MAX_DISTANCE_MILES,
  DELIVERY_ORIGIN_ADDRESS,
  getDeliveryEligibility,
} from "@/lib/delivery";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type CheckoutItem = {
  menuItemId: number;
  variantId: number | null;
  quantity: number;
};

type CheckoutRequestBody = {
  items: CheckoutItem[];
  fulfillment: FulfillmentMethod;
  notes?: string;
  deliveryAddress?: string;
};

function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return value === "pickup" || value === "delivery";
}

function isCheckoutItem(value: unknown): value is CheckoutItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  const variantIdRaw = "variantId" in item ? item.variantId : null;
  const variantIdValid =
    variantIdRaw === null ||
    variantIdRaw === undefined ||
    (typeof variantIdRaw === "number" && Number.isInteger(variantIdRaw) && variantIdRaw > 0);

  return (
    typeof item.menuItemId === "number" &&
    Number.isInteger(item.menuItemId) &&
    item.menuItemId > 0 &&
    variantIdValid &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function parseCheckoutRequest(value: unknown): CheckoutRequestBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const body = value as {
    items?: unknown;
    fulfillment?: unknown;
    notes?: unknown;
    deliveryAddress?: unknown;
  };
  if (!Array.isArray(body.items) || !isFulfillmentMethod(body.fulfillment)) {
    return null;
  }

  const items = body.items.filter(isCheckoutItem);
  if (items.length === 0 || items.length !== body.items.length) {
    return null;
  }

  const normalizedItems = items.map((item) => ({
    menuItemId: item.menuItemId,
    variantId: item.variantId ?? null,
    quantity: item.quantity,
  }));

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 500)
      : undefined;

  const deliveryAddress =
    typeof body.deliveryAddress === "string" && body.deliveryAddress.trim()
      ? body.deliveryAddress.trim().slice(0, 240)
      : undefined;

  return {
    items: normalizedItems,
    fulfillment: body.fulfillment,
    notes,
    deliveryAddress,
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
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)" },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(request);

  try {
    const deliveryAddress =
      payload.fulfillment === "delivery"
        ? (payload.deliveryAddress ?? "").trim()
        : "";

    if (payload.fulfillment === "delivery") {
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
            error: `Delivery is available within ${DELIVERY_MAX_DISTANCE_MILES} miles of ${DELIVERY_ORIGIN_ADDRESS}. Your address is about ${eligibility.distanceMiles} miles away.`,
          },
          { status: 400 },
        );
      }
    }

    // Never trust cart prices coming from the client. Always look up the latest menu item
    // details from the database to prevent price tampering.
    const quantitiesByKey = new Map<string, number>();
    const orderedKeys: string[] = [];
    const orderedMenuItemIds: number[] = [];
    const orderedVariantIds: number[] = [];

    for (const item of payload.items) {
      const key = `${item.menuItemId}:${item.variantId ?? "base"}`;
      if (!quantitiesByKey.has(key)) {
        orderedKeys.push(key);
      }
      quantitiesByKey.set(key, (quantitiesByKey.get(key) ?? 0) + item.quantity);

      if (!orderedMenuItemIds.includes(item.menuItemId)) {
        orderedMenuItemIds.push(item.menuItemId);
      }
      if (item.variantId !== null && !orderedVariantIds.includes(item.variantId)) {
        orderedVariantIds.push(item.variantId);
      }
    }

    if (orderedKeys.length === 0) {
      return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
    }

    const [menuItems, variants] = await Promise.all([
      prisma.menuItem.findMany({
        where: { id: { in: orderedMenuItemIds }, isActive: true },
        select: { id: true, name: true, price: true },
      }),
      orderedVariantIds.length > 0
        ? prisma.menuItemVariant.findMany({
            where: {
              id: { in: orderedVariantIds },
              isActive: true,
              menuItem: { isActive: true },
            },
            select: {
              id: true,
              menuItemId: true,
              label: true,
              price: true,
              menuItem: {
                select: {
                  name: true,
                },
              },
            },
          })
        : [],
    ]);

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    const normalizedItems = orderedKeys.map((key) => {
      const [menuIdRaw, variantRaw] = key.split(":");
      const menuItemId = Number.parseInt(menuIdRaw ?? "", 10);
      const variantId = variantRaw === "base" ? null : Number.parseInt(variantRaw ?? "", 10);

      const quantity = quantitiesByKey.get(key) ?? 0;
      if (!Number.isInteger(menuItemId) || menuItemId <= 0 || quantity <= 0) {
        return null;
      }

      if (!variantId) {
        const menuItem = menuById.get(menuItemId);
        if (!menuItem) {
          return null;
        }
        return {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
        };
      }

      const variant = variantsById.get(variantId);
      if (!variant || variant.menuItemId !== menuItemId) {
        return null;
      }

      return {
        id: menuItemId,
        name: `${variant.menuItem.name} (${variant.label})`,
        price: variant.price,
        quantity,
      };
    });

    const invalidCount = normalizedItems.filter((item) => item === null).length;
    if (invalidCount > 0) {
      return NextResponse.json(
        { error: buildItemUnavailableMessage(invalidCount) },
        { status: 400 },
      );
    }

    const normalizedStripeItems = normalizedItems.filter((item): item is NonNullable<typeof item> => item !== null);

    const settings = await prisma.storeSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
      select: { stripeAccountId: true },
    });

    const connectedAccountId =
      typeof settings.stripeAccountId === "string" && settings.stripeAccountId.trim()
        ? settings.stripeAccountId.trim()
        : null;

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      payment_method_types: ["card"],
      line_items: normalizedStripeItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      ...(connectedAccountId
        ? {
            // Route payouts to the connected Stripe account when configured.
            payment_intent_data: {
              on_behalf_of: connectedAccountId,
              transfer_data: { destination: connectedAccountId },
            },
          }
        : {}),
      metadata: {
        fulfillment: payload.fulfillment,
        items: JSON.stringify(normalizedStripeItems),
        ...(deliveryAddress ? { deliveryAddress } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      },
      phone_number_collection: { enabled: true },
      mode: "payment",
      return_url: new URL("/checkout", baseUrl).toString(),
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Stripe checkout client secret is unavailable" },
        { status: 502 }
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch {
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 502 }
    );
  }
}
