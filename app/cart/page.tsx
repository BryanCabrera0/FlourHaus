"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartActions, useCartState } from "../components/CartProvider";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FulfillmentMethod } from "@/lib/types";
import { writeCheckoutClientSecret } from "@/lib/checkoutClientSecret";
import AddressAutocomplete from "../components/AddressAutocomplete";
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

export default function CartPage() {
  const { items, total } = useCartState();
  const { removeFromCart } = useCartActions();
  const router = useRouter();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [schedule, setSchedule] = useState<FulfillmentScheduleConfig | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCheck, setDeliveryCheck] = useState<{
    eligible: boolean;
    distanceMiles: number;
  } | null>(null);
  const [deliveryCheckError, setDeliveryCheckError] = useState<string | null>(
    null,
  );
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
        const response = await fetch("/api/schedule", {
          method: "GET",
          cache: "no-store",
        });
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

  if (items.length === 0) {
    return (
      <div className="bg-surface max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="panel p-14 max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-3 text-fh-heading">Your Cart</h1>
          <p className="mb-8 text-fh-muted">Your cart is empty.</p>
          <Link href="/menu" className="btn-primary py-3 px-8 text-sm inline-block">
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  async function handleCheckout() {
    setCheckoutError(null);
    setIsCheckingOut(true);

    try {
      const trimmedDeliveryAddress = deliveryAddress.trim();

      if (fulfillment === "delivery" && !trimmedDeliveryAddress) {
        throw new Error("Please enter a delivery address.");
      }

      if (!schedule) {
        throw new Error("Scheduling is still loading. Please try again.");
      }

      if (!scheduledDate) {
        throw new Error("Please pick a date for pickup/delivery.");
      }

      if (!scheduledTimeSlot) {
        throw new Error("Please choose a time slot.");
      }

      if (!isSlotAvailable(schedule, fulfillment, scheduledDate, scheduledTimeSlot)) {
        throw new Error("That time slot is not available. Please choose another.");
      }

      const checkoutItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems,
          fulfillment,
          scheduledDate,
          scheduledTimeSlot,
          notes: orderNotes,
          ...(fulfillment === "delivery" && trimmedDeliveryAddress
            ? { deliveryAddress: trimmedDeliveryAddress }
            : {}),
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to start checkout right now. Please try again.";
        throw new Error(errorMessage);
      }

      const clientSecret =
        typeof data === "object" &&
        data !== null &&
        "clientSecret" in data &&
        typeof data.clientSecret === "string"
          ? data.clientSecret
          : null;

      if (!clientSecret) {
        throw new Error("Unable to start checkout right now. Please try again.");
      }

      writeCheckoutClientSecret(clientSecret);
      router.push("/checkout");
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout right now. Please try again.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handleDeliveryCheck(addressOverride?: string) {
    const address = (addressOverride ?? deliveryAddress).trim();
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

  const checkoutDisabled =
    isCheckingOut ||
    !schedule ||
    !scheduledDate ||
    !scheduledTimeSlot ||
    availableSlots.length === 0 ||
    (fulfillment === "delivery" && !deliveryAddress.trim()) ||
    (fulfillment === "delivery" && deliveryCheck !== null && !deliveryCheck.eligible);

  return (
    <div className="bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold mb-10 text-fh-heading">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.lineId} className="card p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-fh-heading">
                    {item.name}
                    {item.variantLabel ? (
                      <span className="text-fh-muted font-semibold">
                        {" "}
                        ({item.variantLabel})
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-sm mt-1 text-fh-muted">
                    Qty: {item.quantity} &times; {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-fh-success">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                  <button onClick={() => removeFromCart(item.lineId)} className="btn-remove text-sm">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="panel cart-summary-panel p-7 h-fit">
            <h2 className="text-lg font-semibold mb-5 text-fh-heading">Order Summary</h2>
            <div className="flex justify-between mb-2 text-fh-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="my-5 border-t surface-divider"></div>
            <div className="flex justify-between font-bold text-lg mb-7 text-fh-heading">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <p className="text-sm font-medium mb-3 text-fh-muted">Fulfillment Method</p>
            <div className="toggle-track flex gap-3 mb-7 p-1.5 rounded-xl">
              <button
                onClick={() => {
                  setFulfillment("pickup");
                  setScheduledDate("");
                  setScheduledTimeSlot("");
                  setCheckoutError(null);
                }}
                className={`flex-1 py-2.5 font-semibold text-sm transition-all ${fulfillment === "pickup" ? "toggle-active" : "toggle-inactive"}`}
              >
                Pickup
              </button>
              <button
                onClick={() => {
                  setFulfillment("delivery");
                  setScheduledDate("");
                  setScheduledTimeSlot("");
                  setCheckoutError(null);
                }}
                className={`flex-1 py-2.5 font-semibold text-sm transition-all ${fulfillment === "delivery" ? "toggle-active" : "toggle-inactive"}`}
              >
                Delivery
              </button>
            </div>

            {fulfillment === "delivery" ? (
              <div className="mb-6">
                <label className="text-sm font-medium block mb-2 text-fh-muted">
                  Delivery Address *
                </label>
                <AddressAutocomplete
                  value={deliveryAddress}
                  onChange={(next) => {
                    setDeliveryAddress(next);
                    setDeliveryCheck(null);
                    setDeliveryCheckError(null);
                  }}
                  onSelect={(selected) => {
                    void handleDeliveryCheck(selected);
                  }}
                  onBlur={() => void handleDeliveryCheck()}
                  maxLength={240}
                  placeholder="Street address, city, state, ZIP"
                  className="w-full rounded-xl px-3 py-2.5 text-sm input-soft"
                  disabled={isCheckingOut}
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
                      Outside our delivery radius (about {deliveryCheck.distanceMiles} miles away).
                      Please choose pickup.
                    </p>
                  )
                ) : deliveryCheckError ? (
                  <p className="feedback-error text-xs mt-3 p-3 rounded-lg">
                    {deliveryCheckError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mb-6">
              <p className="text-sm font-medium mb-3 text-fh-muted">
                Schedule {fulfillment === "pickup" ? "Pickup" : "Delivery"} *
              </p>

              {scheduleError ? (
                <p className="feedback-error text-sm p-3 rounded-lg">
                  {scheduleError}
                </p>
              ) : !schedule ? (
                <p className="text-sm text-fh-muted">Loading available times…</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2 text-fh-muted">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(event) => {
                          setScheduledDate(event.target.value);
                          setCheckoutError(null);
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
                          setCheckoutError(null);
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

            <label className="text-sm font-medium block mb-2 text-fh-muted">
              Order Notes (optional)
            </label>
            <textarea
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              maxLength={500}
              placeholder="Add allergy details, pickup timing, or delivery notes."
              className="w-full mb-6 rounded-xl px-3 py-2.5 text-sm input-soft"
              rows={3}
            />

            {checkoutError ? (
              <p className="feedback-error text-sm mb-4 p-3 rounded-lg">{checkoutError}</p>
            ) : null}

            <button
              onClick={handleCheckout}
              disabled={checkoutDisabled}
              className="w-full btn-primary py-3.5 text-sm disabled:opacity-50"
            >
              {isCheckingOut ? "Preparing..." : "Checkout"}
            </button>
            {fulfillment === "pickup" ? (
              <p className="mt-3 text-xs text-fh-muted leading-relaxed">
                Pickup is in the 33185 area. The exact pickup address will be provided after your order is placed.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
