"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/format";
import type { FulfillmentMethod } from "@/lib/types";
import {
  addDays,
  formatTimeSlotLabel,
  getSlotsForDate,
  getMinAllowedDateString,
  getTodayDateString,
  isSlotAvailable,
  normalizeScheduleConfig,
  STORE_TIME_ZONE,
  type FulfillmentScheduleConfig,
} from "@/lib/fulfillmentSchedule";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Props = {
  token: string;
  requestId: number;
  fulfillment: FulfillmentMethod;
  amount: number;
  defaultDeliveryAddress?: string | null;
};

export default function CustomOrderPayClient({
  token,
  requestId,
  fulfillment,
  amount,
  defaultDeliveryAddress,
}: Props) {
  const router = useRouter();

  const [schedule, setSchedule] = useState<FulfillmentScheduleConfig | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState(
    fulfillment === "delivery" ? (defaultDeliveryAddress ?? "") : "",
  );
  const [deliveryCheck, setDeliveryCheck] = useState<{
    eligible: boolean;
    distanceMiles: number;
  } | null>(null);
  const [deliveryCheckError, setDeliveryCheckError] = useState<string | null>(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);

  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const scheduleTimezone = schedule?.timezone ?? STORE_TIME_ZONE;
  const todayDate = useMemo(
    () => getTodayDateString(scheduleTimezone),
    [scheduleTimezone],
  );
  const minDate = useMemo(() => {
    if (!schedule) return todayDate;
    return getMinAllowedDateString(schedule);
  }, [schedule, todayDate]);
  const maxDate = useMemo(() => {
    if (!schedule) return "";
    return addDays(todayDate, schedule.maxDaysAhead) ?? "";
  }, [schedule, todayDate]);

  const availableSlots = useMemo(() => {
    if (!schedule || !scheduledDate) {
      return [];
    }
    return getSlotsForDate(schedule, fulfillment, scheduledDate);
  }, [fulfillment, schedule, scheduledDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      setScheduleError(null);
      try {
        const response = await fetch("/api/schedule", { method: "GET", cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { schedule?: FulfillmentScheduleConfig; error?: string }
          | null;

        if (!response.ok || !payload?.schedule) {
          throw new Error(payload?.error ?? "Unable to load scheduling settings.");
        }

        if (!cancelled) {
          setSchedule(normalizeScheduleConfig(payload.schedule));
        }
      } catch (err) {
        if (!cancelled) {
          setSchedule(null);
          setScheduleError(
            err instanceof Error ? err.message : "Unable to load scheduling settings.",
          );
        }
      }
    }

    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (scheduledTimeSlot && !availableSlots.includes(scheduledTimeSlot)) {
      setScheduledTimeSlot("");
    }
  }, [availableSlots, scheduledTimeSlot]);

  useEffect(() => {
    if (!scheduledDate) return;
    if (scheduledDate < minDate) {
      setScheduledDate("");
      setScheduledTimeSlot("");
    }
  }, [minDate, scheduledDate]);

  async function handleDeliveryCheck() {
    const address = deliveryAddress.trim();
    if (!address || isCheckingDelivery) {
      return;
    }

    setDeliveryCheck(null);
    setDeliveryCheckError(null);
    setIsCheckingDelivery(true);

    try {
      const response = await fetch("/api/delivery/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { eligible?: boolean; distanceMiles?: number; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to check delivery address.");
      }

      if (typeof payload?.eligible !== "boolean" || typeof payload.distanceMiles !== "number") {
        throw new Error("Unable to check delivery address.");
      }

      setDeliveryCheck({
        eligible: payload.eligible,
        distanceMiles: payload.distanceMiles,
      });
    } catch (err) {
      setDeliveryCheck(null);
      setDeliveryCheckError(
        err instanceof Error ? err.message : "Unable to check delivery address.",
      );
    } finally {
      setIsCheckingDelivery(false);
    }
  }

  async function startPayment() {
    setPaymentError(null);
    setIsStartingPayment(true);
    setClientSecret(null);

    try {
      if (!schedule) {
        throw new Error("Scheduling is still loading. Please try again.");
      }

      if (!scheduledDate) {
        throw new Error("Please pick a date.");
      }

      if (!scheduledTimeSlot) {
        throw new Error("Please choose a time slot.");
      }

      if (!isSlotAvailable(schedule, fulfillment, scheduledDate, scheduledTimeSlot)) {
        throw new Error("That time slot is not available. Please choose another.");
      }

      const trimmedDeliveryAddress = deliveryAddress.trim().slice(0, 240);
      if (fulfillment === "delivery" && !trimmedDeliveryAddress) {
        throw new Error("Please enter a delivery address.");
      }

      const response = await fetch("/api/custom-orders/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          scheduledDate,
          scheduledTimeSlot,
          ...(fulfillment === "delivery" && trimmedDeliveryAddress
            ? { deliveryAddress: trimmedDeliveryAddress }
            : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { clientSecret?: string; error?: string }
        | null;

      if (!response.ok || !payload?.clientSecret) {
        throw new Error(payload?.error ?? "Unable to start payment.");
      }

      setClientSecret(payload.clientSecret);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Unable to start payment.");
    } finally {
      setIsStartingPayment(false);
    }
  }

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      onComplete: () => {
        router.replace("/success");
      },
    };
  }, [clientSecret, router]);

  const checkoutDisabled =
    isStartingPayment ||
    !!clientSecret ||
    !schedule ||
    !scheduledDate ||
    !scheduledTimeSlot ||
    availableSlots.length === 0 ||
    (fulfillment === "delivery" && !deliveryAddress.trim()) ||
    (fulfillment === "delivery" && deliveryCheck !== null && !deliveryCheck.eligible);

  return (
    <div className="space-y-6">
      <div className="surface-soft p-5">
        <p className="kicker kicker-blue mb-2">Schedule</p>
        <p className="text-sm text-fh-muted">
          Please select a date and time slot for {fulfillment === "delivery" ? "delivery" : "pickup"}.
        </p>

        {scheduleError ? (
          <p className="feedback-error text-sm p-3 rounded-lg mt-4">{scheduleError}</p>
        ) : !schedule ? (
          <p className="text-sm text-fh-muted mt-4">Loading available times…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium block mb-2 text-fh-muted">
                  Date *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => {
                    setScheduledDate(event.target.value);
                    setPaymentError(null);
                  }}
                  min={minDate}
                  max={maxDate}
                  className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 text-fh-muted">
                  Time Slot *
                </label>
                <select
                  value={scheduledTimeSlot}
                  onChange={(event) => {
                    setScheduledTimeSlot(event.target.value);
                    setPaymentError(null);
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
                  disabled={!scheduledDate || availableSlots.length === 0}
                  required
                >
                  <option value="" disabled>
                    {scheduledDate ? "Choose a time slot" : "Choose a date first"}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTimeSlotLabel(slot)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scheduledDate && availableSlots.length === 0 ? (
              <p className="feedback-error text-xs mt-3 p-3 rounded-lg">
                No time slots are available for that day. Please choose a different date.
              </p>
            ) : null}

            <p className="text-xs text-fh-muted mt-2">
              Earliest available date: {minDate}. You can schedule up to{" "}
              {schedule.maxDaysAhead} days ahead.
            </p>
          </>
        )}
      </div>

      {fulfillment === "delivery" ? (
        <div className="surface-soft p-5">
          <p className="kicker kicker-accent mb-2">Delivery address</p>
          <label className="text-sm font-medium block mb-2 text-fh-muted">
            Address *
          </label>
          <input
            value={deliveryAddress}
            onChange={(event) => {
              setDeliveryAddress(event.target.value);
              setDeliveryCheck(null);
              setDeliveryCheckError(null);
              setPaymentError(null);
            }}
            onBlur={() => void handleDeliveryCheck()}
            maxLength={240}
            placeholder="Street address, city, state, ZIP"
            className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
            required
          />

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleDeliveryCheck()}
              disabled={isCheckingDelivery || !deliveryAddress.trim()}
              className="btn-ghost py-2 px-3 text-xs disabled:opacity-60"
            >
              {isCheckingDelivery ? "Checking..." : "Check eligibility"}
            </button>
            <p className="text-xs text-fh-muted">
              Delivery available within 5 miles of 33185.
            </p>
          </div>

          {deliveryCheck ? (
            deliveryCheck.eligible ? (
              <p className="feedback-success text-xs mt-3 p-3 rounded-lg">
                Eligible for delivery (about {deliveryCheck.distanceMiles} miles away).
              </p>
            ) : (
              <p className="feedback-error text-xs mt-3 p-3 rounded-lg">
                Outside our delivery radius (about {deliveryCheck.distanceMiles} miles away). Please contact the bakery for options.
              </p>
            )
          ) : deliveryCheckError ? (
            <p className="feedback-error text-xs mt-3 p-3 rounded-lg">{deliveryCheckError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="surface-soft p-5">
        <p className="kicker kicker-success mb-2">Payment</p>
        <p className="text-sm text-fh-muted">
          Amount due:{" "}
          <span className="font-semibold text-fh-heading">{formatCurrency(amount)}</span>
        </p>

        {publishableKey ? null : (
          <p className="feedback-error text-sm p-3 rounded-lg mt-4">
            Stripe is not configured (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
          </p>
        )}

        {paymentError ? (
          <p className="feedback-error text-sm p-3 rounded-lg mt-4">{paymentError}</p>
        ) : null}

        {!clientSecret ? (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void startPayment()}
              disabled={checkoutDisabled}
              className="btn-primary py-3 px-6 text-sm disabled:opacity-50"
            >
              {isStartingPayment ? "Preparing..." : "Continue to payment"}
            </button>
            <Link href="/menu" className="btn-admin-nav py-3 px-6 text-sm">
              Browse menu
            </Link>
            <p className="text-xs text-fh-muted">
              Order #{requestId} will be scheduled when you pay.
            </p>
          </div>
        ) : null}

        {clientSecret && stripePromise && options ? (
          <div className="mt-6">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : clientSecret ? (
          <p className="text-sm text-fh-muted mt-6">Loading secure checkout…</p>
        ) : null}
      </div>
    </div>
  );
}
