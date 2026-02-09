import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getStripeClient } from "@/lib/stripeAdmin";

export const runtime = "nodejs";

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
  } catch {
    return NextResponse.json(
      { error: "Unable to open Stripe dashboard for this account." },
      { status: 502 }
    );
  }
}
