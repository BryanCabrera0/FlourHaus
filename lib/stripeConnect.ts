import "server-only";

import type Stripe from "stripe";

type StripeConnectValidationError = {
  code?: unknown;
  statusCode?: unknown;
};

function isConnectAccountUnavailable(error: unknown): boolean {
  const err = error as StripeConnectValidationError | null;
  const code = err?.code;
  const statusCode = err?.statusCode;

  // Common cases:
  // - resource_missing: the account id doesn't exist under this secret key/mode.
  // - platform_account_required: Connect not enabled (or wrong key) so we cannot access connected accounts.
  // - 404: some Stripe SDK responses expose HTTP status codes.
  return (
    code === "resource_missing" ||
    code === "platform_account_required" ||
    statusCode === 404
  );
}

export async function resolveConnectedStripeAccountId(
  stripe: Stripe,
  accountId: string | null,
): Promise<string | null> {
  if (!accountId) {
    return null;
  }

  try {
    const retrieved = await stripe.accounts.retrieve(accountId);
    if ("deleted" in retrieved && retrieved.deleted) {
      return null;
    }
    return retrieved.id;
  } catch (error) {
    if (isConnectAccountUnavailable(error)) {
      return null;
    }

    console.error("Unable to validate Stripe Connect account id", error);
    return null;
  }
}

