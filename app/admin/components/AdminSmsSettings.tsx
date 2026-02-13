"use client";

import { useCallback, useEffect, useState } from "react";

type CarrierOption = { key: string; label: string };

type Props = {
  initialPhone: string | null;
  initialCarrier: string | null;
};

export default function AdminSmsSettings({
  initialPhone,
  initialCarrier,
}: Props) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [carrier, setCarrier] = useState(initialCarrier ?? "");
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/sms", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        ownerSmsPhone?: string | null;
        ownerSmsCarrier?: string | null;
        emailConfigured?: boolean;
        carriers?: CarrierOption[];
      } | null;

      if (response.ok && payload) {
        setEmailConfigured(payload.emailConfigured ?? false);
        if (payload.carriers) setCarriers(payload.carriers);
        if (payload.ownerSmsPhone) setPhone(payload.ownerSmsPhone);
        if (payload.ownerSmsCarrier) setCarrier(payload.ownerSmsCarrier);
      }
    } catch {
      // Non-critical; initial data already provided via props
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    if (isSaving) return;
    clearFeedback();
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerSmsPhone: phone || null,
          ownerSmsCarrier: carrier || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ownerSmsPhone?: string | null;
        ownerSmsCarrier?: string | null;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save settings.");
      }

      setPhone(payload?.ownerSmsPhone ?? "");
      setCarrier(payload?.ownerSmsCarrier ?? "");
      setSuccess("SMS settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    if (isTesting) return;
    clearFeedback();
    setIsTesting(true);

    try {
      const response = await fetch("/api/admin/settings/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to send test SMS.");
      }

      setSuccess("Test SMS sent! Check your phone.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send test SMS.",
      );
    } finally {
      setIsTesting(false);
    }
  }

  async function handleClear() {
    if (isSaving) return;
    clearFeedback();
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerSmsPhone: null,
          ownerSmsCarrier: null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to clear settings.");
      }

      setPhone("");
      setCarrier("");
      setSuccess("SMS notifications disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear.");
    } finally {
      setIsSaving(false);
    }
  }

  const busy = isSaving || isTesting;

  return (
    <section className="panel p-6">
      <h2 className="text-2xl font-bold mb-1 text-fh-heading">
        SMS Notifications
      </h2>
      <p className="text-sm text-fh-muted mb-6">
        Receive a text message when a new order is placed. Uses your existing
        email service — no extra cost.
      </p>

      {!emailConfigured ? (
        <div className="surface-soft p-4 mb-4">
          <span className="badge badge-canceled">email not configured</span>
          <p className="text-xs text-fh-muted mt-2">
            SMS notifications require email to be set up. Configure{" "}
            <code className="code-chip px-1">RESEND_API_KEY</code> and{" "}
            <code className="code-chip px-1">RESEND_FROM_EMAIL</code> first.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFeedback();
            }}
            className="admin-input"
            placeholder="5551234567"
            disabled={busy}
          />
          <p className="text-[11px] mt-2 text-fh-muted">
            10-digit US number, no dashes or spaces.
          </p>
        </div>

        <div>
          <label className="admin-label">Phone carrier</label>
          <select
            value={carrier}
            onChange={(e) => {
              setCarrier(e.target.value);
              clearFeedback();
            }}
            className="admin-input"
            disabled={busy}
          >
            <option value="">Select carrier...</option>
            {carriers.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] mt-2 text-fh-muted">
            Needed to route the text message to your phone.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || !emailConfigured}
          className="btn-primary py-2.5 px-4 text-xs disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={busy || !emailConfigured || !phone.trim() || !carrier}
          className="btn-admin-nav py-2.5 px-4 text-xs disabled:opacity-50"
        >
          {isTesting ? "Sending..." : "Send Test SMS"}
        </button>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={busy || (!phone.trim() && !carrier)}
          className="btn-admin-nav py-2.5 px-4 text-xs disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {error ? (
        <p className="feedback-error text-sm mt-4 p-3 rounded-lg">{error}</p>
      ) : null}
      {success ? (
        <p className="feedback-success text-sm mt-4 p-3 rounded-lg">
          {success}
        </p>
      ) : null}
    </section>
  );
}
