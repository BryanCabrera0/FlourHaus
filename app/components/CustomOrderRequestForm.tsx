"use client";

import { useMemo, useState, type FormEvent } from "react";
import AddressAutocomplete from "./AddressAutocomplete";

type FormState = {
  name: string;
  email: string;
  phone: string;
  desiredItems: string;
  requestedDate: string;
  fulfillmentPreference: "" | "pickup" | "delivery";
  deliveryAddress: string;
  budget: string;
  details: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  desiredItems: "",
  requestedDate: "",
  fulfillmentPreference: "",
  deliveryAddress: "",
  budget: "",
  details: "",
};

export default function CustomOrderRequestForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.name.trim() || !form.email.trim() || !form.desiredItems.trim() || !form.details.trim()) {
      setError("Please complete name, email, desired items, and details.");
      return;
    }

    if (!form.fulfillmentPreference) {
      setError("Please choose a fulfillment method (pickup or delivery).");
      return;
    }

    if (form.fulfillmentPreference === "delivery" && !form.deliveryAddress.trim()) {
      setError("Please enter a delivery address for delivery requests.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/custom-orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | { requestId?: number; error?: string }
        | null;
      if (!response.ok || typeof payload?.requestId !== "number") {
        throw new Error(payload?.error ?? "Failed to submit request.");
      }

      setForm(INITIAL_FORM);
      setSuccessMessage(
        `Request #${payload.requestId} was sent. We will review it and follow up by email.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Name *</label>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength={120}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="Your full name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            maxLength={320}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            maxLength={40}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="(305) 555-1212"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Needed By (optional)</label>
          <input
            type="date"
            value={form.requestedDate}
            min={minDate}
            onChange={(event) => updateField("requestedDate", event.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Fulfillment *</label>
          <select
            value={form.fulfillmentPreference}
            onChange={(event) =>
              updateField("fulfillmentPreference", event.target.value as FormState["fulfillmentPreference"])
            }
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            required
          >
            <option value="" disabled>
              Choose pickup or delivery
            </option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {form.fulfillmentPreference === "delivery" ? (
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">
            Delivery Address *
          </label>
          <AddressAutocomplete
            value={form.deliveryAddress}
            onChange={(next) => updateField("deliveryAddress", next)}
            maxLength={240}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="Street address, city, state, ZIP"
            required
          />
          <p className="text-xs mt-2 text-fh-muted">
            Delivery requests must be within 5 miles of 33185.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">What would you like? *</label>
          <input
            value={form.desiredItems}
            onChange={(event) => updateField("desiredItems", event.target.value)}
            maxLength={240}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="Example: 8-inch unicorn birthday cake + matching cupcakes"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1 block text-fh-body">Budget (optional)</label>
          <input
            value={form.budget}
            onChange={(event) => updateField("budget", event.target.value)}
            maxLength={120}
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            placeholder="Example: Around $150"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-1 block text-fh-body">
          Design notes, flavors, allergies, and anything else *
        </label>
        <textarea
          value={form.details}
          onChange={(event) => updateField("details", event.target.value)}
          maxLength={2500}
          rows={5}
          className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
          placeholder="Share your theme, serving count, flavor ideas, and any dietary needs."
          required
        />
      </div>

      {error ? <p className="feedback-error text-sm p-3 rounded-lg">{error}</p> : null}
      {successMessage ? <p className="feedback-success text-sm p-3 rounded-lg">{successMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary py-3.5 px-8 text-sm disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : "Send Custom Request"}
      </button>
    </form>
  );
}
