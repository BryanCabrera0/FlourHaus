import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getStripeClient, readStripeSecretKey } from "@/lib/stripe";

export const runtime = "nodejs";

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
      { error: `Server misconfiguration: ${stripeKey.source} must be a full secret key (sk_...), not a restricted key (rk_...). Stripe Connect APIs require a standard secret key.` },
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

  if (!settings.stripeAccountId) {
    return NextResponse.json(
      { error: "Stripe account is not linked yet." },
      { status: 400 }
    );
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(settings.stripeAccountId);

    await prisma.adminAuditLog.create({
      data: {
        action: "stripe.account.login_link.generate",
        entityType: "StoreSettings",
        entityId: 1,
        details: JSON.stringify({
          stripeAccountId: settings.stripeAccountId,
        }),
        actorEmail: auth.session.email,
      },
    });

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    const details = error instanceof Error && error.message ? ` ${error.message}` : "";
    return NextResponse.json(
      { error: `Unable to open Stripe dashboard for this account.${details}` },
      { status: 502 }
    );
  }
}
