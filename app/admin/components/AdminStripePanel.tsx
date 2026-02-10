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

type PaymentMethodDomainSummary = {
  id: string;
  domainName: string;
  enabled: boolean;
  createdAt: string;
  applePay: { status: "active" | "inactive"; error?: string };
  googlePay: { status: "active" | "inactive"; error?: string };
  link: { status: "active" | "inactive"; error?: string };
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

  const [walletDomains, setWalletDomains] = useState<PaymentMethodDomainSummary[]>([]);
  const [walletDomainInput, setWalletDomainInput] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);

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

  const loadWalletDomains = useCallback(async () => {
    setWalletError(null);
    try {
      const response = await fetch("/api/admin/stripe/payment-method-domains", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { domains?: PaymentMethodDomainSummary[]; error?: string }
        | null;

      if (!response.ok || !payload?.domains) {
        throw new Error(payload?.error ?? "Unable to load wallet domain status.");
      }

      setWalletDomains(payload.domains);
    } catch (err) {
      setWalletDomains([]);
      setWalletError(err instanceof Error ? err.message : "Unable to load wallet domain status.");
    }
  }, []);

  useEffect(() => {
    setWalletDomainInput(window.location.hostname);
    void loadWalletDomains();
  }, [loadWalletDomains]);

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

  const walletDomain = useMemo(() => {
    const hostname = walletDomainInput.trim().toLowerCase();
    if (!hostname) return null;
    return walletDomains.find((domain) => domain.domainName === hostname) ?? null;
  }, [walletDomainInput, walletDomains]);

  async function handleRegisterWalletDomain() {
    if (walletBusy) return;

    const domainName = walletDomainInput.trim();
    if (!domainName) {
      setWalletError("Enter a domain name first.");
      return;
    }

    setWalletBusy(true);
    setWalletError(null);
    setWalletSuccess(null);

    try {
      const response = await fetch("/api/admin/stripe/payment-method-domains", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domainName }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { domain?: PaymentMethodDomainSummary; error?: string }
        | null;

      if (!response.ok || !payload?.domain) {
        throw new Error(payload?.error ?? "Unable to register domain.");
      }

      setWalletSuccess("Domain registered. Refreshing status...");
      await loadWalletDomains();
      setWalletSuccess("Wallet domain updated.");
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Unable to register domain.");
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleValidateWalletDomain(domainId: string) {
    if (walletBusy) return;
    setWalletBusy(true);
    setWalletError(null);
    setWalletSuccess(null);

    try {
      const response = await fetch(`/api/admin/stripe/payment-method-domains/${domainId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as
        | { domain?: PaymentMethodDomainSummary; error?: string }
        | null;

      if (!response.ok || !payload?.domain) {
        throw new Error(payload?.error ?? "Unable to validate domain.");
      }

      setWalletSuccess("Domain validated. Refreshing status...");
      await loadWalletDomains();
      setWalletSuccess("Wallet domain status refreshed.");
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Unable to validate domain.");
    } finally {
      setWalletBusy(false);
    }
  }

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
                    className="px-1.5 py-0.5 rounded code-chip"
                  >
                    {status.account.id}
                  </code>
                </p>

                {status.account.requirementsDue.length > 0 ? (
                  <div
                    className="text-sm p-3 rounded-lg callout-warn"
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

          <div className="card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-fh-heading">Wallets (Apple Pay)</h3>
                <p className="text-sm text-fh-muted">
                  Apple Pay appears automatically in embedded checkout once your domain is registered with Stripe.
                </p>
                <p className="text-xs text-fh-muted">
                  Note: Embedded checkout wallet rendering requires Safari/iOS 17+ and Apple Pay set up in the customer&apos;s Wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadWalletDomains()}
                disabled={walletBusy}
                className="btn-admin-nav py-2 px-4 text-xs disabled:opacity-50 w-fit"
              >
                Refresh wallet status
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="admin-label">Domain name</label>
                <input
                  value={walletDomainInput}
                  onChange={(e) => setWalletDomainInput(e.target.value)}
                  className="admin-input"
                  placeholder="flourhaus.vercel.app"
                  disabled={walletBusy}
                />
                <p className="text-[11px] mt-2 text-fh-muted">
                  Use your live domain (no http/https, no path). Example: <code className="code-chip px-1">flourhaus.vercel.app</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRegisterWalletDomain()}
                disabled={walletBusy || !walletDomainInput.trim()}
                className="btn-primary py-3 px-4 text-xs disabled:opacity-50"
              >
                {walletBusy ? "Working..." : walletDomain ? "Update domain" : "Register domain"}
              </button>
            </div>

            {walletError ? (
              <p className="feedback-error text-sm mt-4 p-3 rounded-lg">{walletError}</p>
            ) : null}
            {walletSuccess ? (
              <p className="feedback-success text-sm mt-4 p-3 rounded-lg">{walletSuccess}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="surface-soft p-4">
                <p className="kicker kicker-accent mb-2">Apple Pay</p>
                <p className="text-sm font-semibold text-fh-heading">
                  {walletDomain ? walletDomain.applePay.status : "not registered"}
                </p>
                {walletDomain?.applePay.error ? (
                  <p className="text-xs text-fh-muted mt-2">{walletDomain.applePay.error}</p>
                ) : null}
                {walletDomain && walletDomain.applePay.status !== "active" ? (
                  <button
                    type="button"
                    onClick={() => void handleValidateWalletDomain(walletDomain.id)}
                    disabled={walletBusy}
                    className="btn-admin-nav mt-3 py-2 px-3 text-xs disabled:opacity-50"
                  >
                    Validate
                  </button>
                ) : null}
              </div>
              <div className="surface-soft p-4">
                <p className="kicker kicker-blue mb-2">Google Pay</p>
                <p className="text-sm font-semibold text-fh-heading">
                  {walletDomain ? walletDomain.googlePay.status : "not registered"}
                </p>
                {walletDomain?.googlePay.error ? (
                  <p className="text-xs text-fh-muted mt-2">{walletDomain.googlePay.error}</p>
                ) : null}
              </div>
              <div className="surface-soft p-4">
                <p className="kicker kicker-success mb-2">Link</p>
                <p className="text-sm font-semibold text-fh-heading">
                  {walletDomain ? walletDomain.link.status : "not registered"}
                </p>
                {walletDomain?.link.error ? (
                  <p className="text-xs text-fh-muted mt-2">{walletDomain.link.error}</p>
                ) : null}
              </div>
            </div>
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
              <p className="kicker kicker-blue mb-2">Pending Balance</p>
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
                    className="border surface-divider rounded-lg px-3 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
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
