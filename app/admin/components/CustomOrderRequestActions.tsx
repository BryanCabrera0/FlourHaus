"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";

type Props = {
  requestId: number;
  customerName: string;
  customerEmail: string;
  currentStatus: CustomOrderRequestStatus;
};

const STATUS_LABEL: Record<CustomOrderRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  denied: "Denied",
};

function normalizeSubject(value: string) {
  return value.trim().slice(0, 180);
}

function normalizeMessage(value: string) {
  return value.trim().slice(0, 4000);
}

export default function CustomOrderRequestActions({
  requestId,
  customerName,
  customerEmail,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<CustomOrderRequestStatus>(currentStatus);
  const [subject, setSubject] = useState(`Re: Custom order request #${requestId}`);
  const [message, setMessage] = useState("");
  const [includeStatus, setIncludeStatus] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusChanged = status !== currentStatus;
  const sendStatusValue = useMemo(() => (includeStatus ? status : undefined), [includeStatus, status]);

  async function saveStatus() {
    if (!statusChanged || isSavingStatus) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSavingStatus(true);
    try {
      const response = await fetch(`/api/admin/custom-orders/${requestId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to update status.");
      }
      router.refresh();
      setSuccess("Status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function sendEmail() {
    if (isSending) {
      return;
    }

    const normalizedSubject = normalizeSubject(subject);
    const normalizedMessage = normalizeMessage(message);
    if (!normalizedSubject || !normalizedMessage) {
      setError("Subject and message are required.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/custom-orders/${requestId}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: normalizedSubject,
          message: normalizedMessage,
          ...(sendStatusValue ? { status: sendStatusValue } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to send email.");
      }

      setMessage("");
      setSuccess(`Email sent to ${customerEmail}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:items-end">
      <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as CustomOrderRequestStatus)}
          className="admin-input"
          style={{ width: "auto", paddingRight: "32px" }}
          disabled={isSavingStatus || isSending}
          aria-label="Custom order request status"
        >
          {CUSTOM_ORDER_REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={saveStatus}
          disabled={isSavingStatus || isSending || !statusChanged}
          className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
        >
          {isSavingStatus ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="w-full md:w-[360px] surface-soft p-4">
        <p className="kicker kicker-accent mb-2">Message Customer</p>
        <p className="text-xs mb-3 text-fh-muted">
          To: <span className="font-semibold">{customerName}</span> ({customerEmail})
        </p>
        <label className="admin-label">Subject</label>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="admin-input mb-3"
          maxLength={180}
          disabled={isSending || isSavingStatus}
        />
        <label className="admin-label">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="admin-input"
          rows={5}
          maxLength={4000}
          disabled={isSending || isSavingStatus}
          placeholder="Write a reply, ask follow-up questions, confirm pricing, etc."
        />
        <label className="flex items-center gap-2 mt-3 text-xs text-fh-body">
          <input
            type="checkbox"
            checked={includeStatus}
            onChange={(event) => setIncludeStatus(event.target.checked)}
            disabled={isSending || isSavingStatus}
          />
          Include current status in email ({status})
        </label>
        <button
          type="button"
          onClick={sendEmail}
          disabled={isSending || isSavingStatus}
          className="btn-pastel-primary text-xs py-2.5 px-4 mt-3 w-full disabled:opacity-50"
        >
          {isSending ? "Sending..." : "Send Email"}
        </button>

        {error ? (
          <p className="text-xs mt-3 text-fh-danger">{error}</p>
        ) : null}
        {success ? (
          <p className="text-xs mt-3 text-fh-accent-blue">{success}</p>
        ) : null}
      </div>
    </div>
  );
}
