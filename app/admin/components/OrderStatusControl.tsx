"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

type OrderStatusControlProps = {
  orderId: number;
  currentStatus: OrderStatus;
};

export default function OrderStatusControl({
  orderId,
  currentStatus,
}: OrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    if (status === currentStatus || isSaving) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            pickupReadyNotification?: {
              status?: "sent" | "skipped" | "failed";
              to?: string;
              reason?: string;
              error?: string;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to update status.");
      }

      const notification = payload?.pickupReadyNotification;
      if (notification?.status === "sent") {
        setSuccess(
          notification.to
            ? `Pickup-ready email sent to ${notification.to}.`
            : "Pickup-ready email sent.",
        );
      } else if (notification?.status === "skipped") {
        if (notification.reason) {
          setSuccess(notification.reason);
        }
      } else if (notification?.status === "failed") {
        if (notification.error) {
          setError(`Status updated, but failed to notify customer: ${notification.error}`);
        } else {
          setError("Status updated, but failed to notify customer.");
        }
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <div className="flex gap-2 items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className="admin-input"
          style={{ width: "auto", paddingRight: "32px" }}
          disabled={isSaving}
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || status === currentStatus}
          className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-fh-danger">{error}</p>
      ) : null}
      {success ? (
        <p className="text-xs text-fh-accent-blue">{success}</p>
      ) : null}
    </div>
  );
}
