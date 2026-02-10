import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getStripeClient, readStripeSecretKey } from "@/lib/stripe";

export const runtime = "nodejs";

function requireFullStripeSecretKey() {
  const stripeKey = readStripeSecretKey();
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)." },
      { status: 500 },
    );
  }

  if (stripeKey.key.startsWith("pk_")) {
    return NextResponse.json(
      { error: `Server misconfiguration: ${stripeKey.source} must be a secret key (sk_...), not a publishable key (pk_...).` },
      { status: 500 },
    );
  }

  if (stripeKey.key.startsWith("rk_")) {
    return NextResponse.json(
      { error: `Server misconfiguration: ${stripeKey.source} must be a full secret key (sk_...), not a restricted key (rk_...).` },
      { status: 500 },
    );
  }

  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  const keyError = requireFullStripeSecretKey();
  if (keyError) {
    return keyError;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing STRIPE_SECRET_KEY (or STRIPE_PLATFORM_SECRET_KEY)." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing domain id." }, { status: 400 });
  }

  try {
    const validated = await stripe.paymentMethodDomains.validate(id);

    await prisma.adminAuditLog.create({
      data: {
        action: "stripe.payment_method_domain.validate",
        entityType: "StripePaymentMethodDomain",
        details: JSON.stringify({
          id: validated.id,
          domainName: validated.domain_name,
          applePayStatus: validated.apple_pay.status,
          googlePayStatus: validated.google_pay.status,
          linkStatus: validated.link.status,
        }),
        actorEmail: auth.session.email,
      },
    });

    return NextResponse.json({
      domain: {
        id: validated.id,
        domainName: validated.domain_name,
        enabled: validated.enabled,
        createdAt: new Date(validated.created * 1000).toISOString(),
        applePay: {
          status: validated.apple_pay.status,
          error: validated.apple_pay.status_details?.error_message,
        },
        googlePay: {
          status: validated.google_pay.status,
          error: validated.google_pay.status_details?.error_message,
        },
        link: {
          status: validated.link.status,
          error: validated.link.status_details?.error_message,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Unable to validate domain.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

