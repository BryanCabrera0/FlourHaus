import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getBaseUrl, getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

async function resolveStripeAccountId(
  stripe: Stripe,
  existingAccountId: string | null
): Promise<{ accountId: string; created: boolean }> {
  if (existingAccountId) {
    try {
      const existing = await stripe.accounts.retrieve(existingAccountId);
      if (!("deleted" in existing && existing.deleted)) {
        return { accountId: existing.id, created: false };
      }
    } catch {
      // Fall through to account creation.
    }
  }

  const created = await stripe.accounts.create({
    type: "express",
    country: "US",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return { accountId: created.id, created: true };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  const settings = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  let resolved: { accountId: string; created: boolean };
  try {
    resolved = await resolveStripeAccountId(stripe, settings.stripeAccountId);
  } catch {
    return NextResponse.json(
      { error: "Unable to create a Stripe account right now." },
      { status: 502 }
    );
  }

  if (settings.stripeAccountId !== resolved.accountId) {
    await prisma.$transaction(async (tx) => {
      await tx.storeSettings.upsert({
        where: { id: 1 },
        create: { id: 1, stripeAccountId: resolved.accountId },
        update: { stripeAccountId: resolved.accountId },
      });

      await tx.adminAuditLog.create({
        data: {
          action: resolved.created ? "stripe.account.create" : "stripe.account.relink",
          entityType: "StoreSettings",
          entityId: 1,
          details: JSON.stringify({
            stripeAccountId: resolved.accountId,
          }),
          actorEmail: auth.session.email,
        },
      });
    });
  }

  const baseUrl = getBaseUrl(request);

  try {
    const accountLink = await stripe.accountLinks.create({
      account: resolved.accountId,
      refresh_url: new URL("/admin?stripe=refresh", baseUrl).toString(),
      return_url: new URL("/admin?stripe=connected", baseUrl).toString(),
      type: "account_onboarding",
    });

    await prisma.adminAuditLog.create({
      data: {
        action: "stripe.account.link.generate",
        entityType: "StoreSettings",
        entityId: 1,
        details: JSON.stringify({
          stripeAccountId: resolved.accountId,
        }),
        actorEmail: auth.session.email,
      },
    });

    return NextResponse.json({
      stripeAccountId: resolved.accountId,
      url: accountLink.url,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate Stripe onboarding link." },
      { status: 502 }
    );
  }
}
