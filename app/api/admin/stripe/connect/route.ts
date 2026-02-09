import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getBaseUrl, getStripeClient, readStripeSecretKey } from "@/lib/stripe";

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

  const stripeKey = readStripeSecretKey();
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)." },
      { status: 500 }
    );
  }

  if (stripeKey.key.startsWith("pk_")) {
    return NextResponse.json(
      { error: `Server misconfiguration: ${stripeKey.source} must be a secret key (sk_...), not a publishable key (pk_...).` },
      { status: 500 }
    );
  }

  if (stripeKey.key.startsWith("rk_")) {
    return NextResponse.json(
      { error: `Server misconfiguration: ${stripeKey.source} must be a full secret key (sk_...), not a restricted key (rk_...). Stripe Connect onboarding requires a standard secret key.` },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)." },
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
  } catch (error) {
    const details = error instanceof Error && error.message ? ` ${error.message}` : "";
    return NextResponse.json(
      { error: `Unable to create or retrieve a Stripe Connect account.${details}` },
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
  } catch (error) {
    const details = error instanceof Error && error.message ? ` ${error.message}` : "";
    return NextResponse.json(
      { error: `Unable to generate Stripe onboarding link.${details}` },
      { status: 502 }
    );
  }
}
