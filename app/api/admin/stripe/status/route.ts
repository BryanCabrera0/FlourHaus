import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminApi";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeStatusResponse = {
  account: {
    linked: boolean;
    id: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDue: string[];
  };
  balances: {
    available: number;
    pending: number;
    currency: string;
  } | null;
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrivalDate: string;
    createdAt: string;
    method: string | null;
  }>;
};

function getEmptyStatus(): StripeStatusResponse {
  return {
    account: {
      linked: false,
      id: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsDue: [],
    },
    balances: null,
    payouts: [],
  };
}

export async function GET(request: NextRequest) {
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
    return NextResponse.json(getEmptyStatus());
  }

  let account:
    | {
        id: string;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        details_submitted: boolean;
        default_currency: string | null;
        requirements: { currently_due: string[] | null } | null;
      }
    | null = null;

  try {
    const retrieved = await stripe.accounts.retrieve(settings.stripeAccountId);
    if ("deleted" in retrieved && retrieved.deleted) {
      await prisma.storeSettings.update({
        where: { id: 1 },
        data: { stripeAccountId: null },
      });
      return NextResponse.json(getEmptyStatus());
    }

    account = {
      id: retrieved.id,
      charges_enabled: retrieved.charges_enabled,
      payouts_enabled: retrieved.payouts_enabled,
      details_submitted: retrieved.details_submitted,
      default_currency: retrieved.default_currency ?? null,
      requirements: retrieved.requirements
        ? { currently_due: retrieved.requirements.currently_due ?? [] }
        : null,
    };
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve Stripe account status." },
      { status: 502 }
    );
  }

  if (!account) {
    return NextResponse.json(getEmptyStatus());
  }

  let balances: StripeStatusResponse["balances"] = null;
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount: account.id });
    const balanceCurrency =
      account.default_currency ??
      balance.available[0]?.currency ??
      balance.pending[0]?.currency ??
      "usd";

    const available = balance.available
      .filter((entry) => entry.currency === balanceCurrency)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const pending = balance.pending
      .filter((entry) => entry.currency === balanceCurrency)
      .reduce((sum, entry) => sum + entry.amount, 0);

    balances = {
      available: available / 100,
      pending: pending / 100,
      currency: balanceCurrency,
    };
  } catch {
    // Balance endpoint can fail on unactivated accounts.
    balances = null;
  }

  let payouts: StripeStatusResponse["payouts"] = [];
  try {
    const payoutList = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: account.id }
    );

    payouts = payoutList.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: new Date(
        (payout.arrival_date ?? payout.created) * 1000
      ).toISOString(),
      createdAt: new Date(payout.created * 1000).toISOString(),
      method: payout.method ?? null,
    }));
  } catch {
    // Payout listing can fail before onboarding is complete.
    payouts = [];
  }

  return NextResponse.json({
    account: {
      linked: true,
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsDue: account.requirements?.currently_due ?? [],
    },
    balances,
    payouts,
  } satisfies StripeStatusResponse);
}
