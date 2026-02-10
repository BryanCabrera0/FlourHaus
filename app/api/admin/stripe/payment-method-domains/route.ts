import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getStripeClient, readStripeSecretKey } from "@/lib/stripe";

export const runtime = "nodejs";

type PaymentMethodDomainSummary = {
  id: string;
  domainName: string;
  enabled: boolean;
  createdAt: string;
  applePay: { status: "active" | "inactive"; error?: string };
  googlePay: { status: "active" | "inactive"; error?: string };
  link: { status: "active" | "inactive"; error?: string };
};

type ListResponse = {
  domains: PaymentMethodDomainSummary[];
};

type CreateBody = {
  domainName?: unknown;
};

function normalizeDomainName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  // Strip protocol if someone pastes a full URL.
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const withoutPort = withoutPath.split(":")[0] ?? "";
  const normalized = withoutPort.trim();
  if (!normalized) return null;

  // Basic hostname validation; Stripe will still validate more strictly.
  if (normalized.length > 255) return null;
  if (!/^[a-z0-9.-]+$/.test(normalized)) return null;
  if (normalized.startsWith(".") || normalized.endsWith(".")) return null;
  if (normalized.includes("..")) return null;

  return normalized;
}

function summaryFromStripeDomain(domain: {
  id: string;
  domain_name: string;
  enabled: boolean;
  created: number;
  apple_pay: { status: "active" | "inactive"; status_details?: { error_message: string } };
  google_pay: { status: "active" | "inactive"; status_details?: { error_message: string } };
  link: { status: "active" | "inactive"; status_details?: { error_message: string } };
}): PaymentMethodDomainSummary {
  return {
    id: domain.id,
    domainName: domain.domain_name,
    enabled: domain.enabled,
    createdAt: new Date(domain.created * 1000).toISOString(),
    applePay: {
      status: domain.apple_pay.status,
      ...(domain.apple_pay.status_details?.error_message
        ? { error: domain.apple_pay.status_details.error_message }
        : {}),
    },
    googlePay: {
      status: domain.google_pay.status,
      ...(domain.google_pay.status_details?.error_message
        ? { error: domain.google_pay.status_details.error_message }
        : {}),
    },
    link: {
      status: domain.link.status,
      ...(domain.link.status_details?.error_message
        ? { error: domain.link.status_details.error_message }
        : {}),
    },
  };
}

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

export async function GET(request: NextRequest) {
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

  try {
    const list = await stripe.paymentMethodDomains.list({ limit: 100 });
    return NextResponse.json({
      domains: list.data.map((domain) =>
        summaryFromStripeDomain(domain),
      ),
    } satisfies ListResponse);
  } catch (error) {
    const details = error instanceof Error && error.message ? ` ${error.message}` : "";
    return NextResponse.json(
      { error: `Unable to load payment method domains.${details}` },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const domainName = normalizeDomainName(body?.domainName);
  if (!domainName) {
    return NextResponse.json(
      { error: "Enter a valid domain name like flourhaus.vercel.app (no path or port)." },
      { status: 400 },
    );
  }

  try {
    // Create (or reuse if already created).
    const created = await stripe.paymentMethodDomains.create({
      domain_name: domainName,
      enabled: true,
    });

    // Attempt to validate right away; some methods (like Apple Pay) can remain inactive until
    // additional steps are completed. The response will include helpful status_details.error_message.
    const validated = await stripe.paymentMethodDomains
      .validate(created.id)
      .catch(() => created);

    await prisma.adminAuditLog.create({
      data: {
        action: "stripe.payment_method_domain.create",
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
      domain: summaryFromStripeDomain(validated),
    });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Unable to create domain.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

