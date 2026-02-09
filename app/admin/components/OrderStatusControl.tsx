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

  async function handleSave() {
    if (status === currentStatus || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Failed to update status.");
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
        <p className="text-xs" style={{ color: "#C06070" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
