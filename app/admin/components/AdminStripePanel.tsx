"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type ActionState = "connect" | "login" | null;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function payoutStatusBadge(status: string): string {
  switch (status) {
    case "paid":
      return "badge badge-paid";
    case "in_transit":
      return "badge badge-ready";
    case "pending":
      return "badge badge-new";
    case "failed":
    case "canceled":
      return "badge badge-canceled";
    default:
      return "badge";
  }
}

async function postForRedirectUrl(endpoint: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Unable to complete Stripe action.");
  }

  return payload.url;
}

export default function AdminStripePanel() {
  const [status, setStatus] = useState<StripeStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState>(null);

  const loadStatus = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/stripe/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | StripeStatusResponse
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("account" in payload)) {
        throw new Error(
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to load Stripe status."
        );
      }

      setStatus(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Stripe status."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onboardingButtonLabel = useMemo(() => {
    if (!status?.account.linked) {
      return "Link Stripe Account";
    }

    if (
      status.account.chargesEnabled &&
      status.account.payoutsEnabled &&
      status.account.detailsSubmitted
    ) {
      return "Update Setup";
    }

    return "Complete Setup";
  }, [status]);

  async function handleConnect() {
    if (action) {
      return;
    }

    setError(null);
    setAction("connect");
    try {
      const url = await postForRedirectUrl("/api/admin/stripe/connect");
      window.location.assign(url);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to open Stripe onboarding."
      );
    } finally {
      setAction(null);
    }
  }

  async function handleStripeDashboard() {
    if (action) {
      return;
    }

    setError(null);
    setAction("login");
    try {
      const url = await postForRedirectUrl("/api/admin/stripe/login");
      window.location.assign(url);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to open Stripe dashboard."
      );
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-fh-heading">
            Stripe Payouts
          </h2>
          <p className="text-sm text-fh-muted">
            Link your Stripe account, monitor onboarding status, and review recent payouts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={isLoading || action !== null}
          className="btn-admin-nav py-2 px-4 text-xs disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="feedback-error text-sm mb-4 p-3 rounded-lg">
          {error}
        </p>
      ) : null}

      {isLoading && !status ? (
        <p className="text-fh-muted">Loading Stripe status...</p>
      ) : null}

      {!isLoading && status ? (
        <div className="space-y-5">
          <div className="card p-4">
            {!status.account.linked ? (
              <div className="space-y-3">
                <p className="text-fh-muted">
                  No Stripe account linked yet. Connect an account to receive payouts.
                </p>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={action !== null}
                  className="btn-primary py-2.5 px-4 text-xs disabled:opacity-50"
                >
                  {action === "connect" ? "Opening..." : onboardingButtonLabel}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${status.account.chargesEnabled ? "badge-paid" : "badge-new"}`}>
                    payments {status.account.chargesEnabled ? "enabled" : "disabled"}
                  </span>
                  <span className={`badge ${status.account.payoutsEnabled ? "badge-ready" : "badge-new"}`}>
                    payouts {status.account.payoutsEnabled ? "enabled" : "disabled"}
                  </span>
                  <span className={`badge ${status.account.detailsSubmitted ? "badge-completed" : "badge-baking"}`}>
                    details {status.account.detailsSubmitted ? "submitted" : "needed"}
                  </span>
                </div>

                <p className="text-sm text-fh-muted">
                  Stripe Account:{" "}
                  <code
                    className="px-1.5 py-0.5 rounded bg-[rgba(91,164,212,0.1)] text-fh-heading"
                  >
                    {status.account.id}
                  </code>
                </p>

                {status.account.requirementsDue.length > 0 ? (
                  <div
                    className="text-sm p-3 rounded-lg text-[#8A5020] bg-[rgba(224,160,64,0.12)]"
                  >
                    <p className="font-semibold mb-1">Stripe still needs:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {status.account.requirementsDue.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={action !== null}
                    className="btn-primary py-2.5 px-4 text-xs disabled:opacity-50"
                  >
                    {action === "connect" ? "Opening..." : onboardingButtonLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleStripeDashboard}
                    disabled={action !== null}
                    className="btn-admin-nav py-2.5 px-4 text-xs disabled:opacity-50"
                  >
                    {action === "login" ? "Opening..." : "Open Stripe Dashboard"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="kicker kicker-success mb-2">Available Balance</p>
              <p className="text-2xl font-bold text-fh-heading">
                {status.balances
                  ? formatMoney(status.balances.available, status.balances.currency)
                  : "—"}
              </p>
            </div>
            <div className="card p-4">
              <p className="kicker mb-2 text-[#40A8A0]">Pending Balance</p>
              <p className="text-2xl font-bold text-fh-heading">
                {status.balances
                  ? formatMoney(status.balances.pending, status.balances.currency)
                  : "—"}
              </p>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-fh-heading">Recent Payouts</h3>
              <span className="text-xs text-fh-muted">Last {status.payouts.length}</span>
            </div>

            {status.payouts.length === 0 ? (
              <p className="text-sm text-fh-muted">
                No payouts yet. Stripe payouts will appear here once processing starts.
              </p>
            ) : (
              <div className="space-y-2">
                {status.payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="border border-[#D5CCE5] rounded-lg px-3 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-fh-heading">
                        {formatMoney(payout.amount, payout.currency)}
                      </p>
                      <p className="text-xs text-fh-muted">Arrival: {formatDate(payout.arrivalDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={payoutStatusBadge(payout.status)}>{payout.status}</span>
                      <span className="text-xs text-fh-muted">
                        {payout.method ?? "standard"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
