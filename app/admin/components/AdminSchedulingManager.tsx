"use client";

import { useMemo, useState } from "react";
import {
  DAY_KEYS,
  formatTimeSlotLabel,
  getDefaultScheduleConfig,
  isValidTimeSlot,
  normalizeScheduleConfig,
  type DayKey,
  type FulfillmentMode,
  type FulfillmentScheduleConfig,
} from "@/lib/fulfillmentSchedule";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type Props = {
  initialSchedule: FulfillmentScheduleConfig;
};

const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKENDS: DayKey[] = ["sat", "sun"];
const DEFAULT_TEMPLATE_SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00"];

async function patchSchedule(schedule: FulfillmentScheduleConfig) {
  const response = await fetch("/api/admin/schedule", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schedule }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { schedule?: FulfillmentScheduleConfig; error?: string }
    | null;

  if (!response.ok || !payload?.schedule) {
    throw new Error(payload?.error ?? "Failed to save schedule.");
  }

  return normalizeScheduleConfig(payload.schedule);
}

async function fetchSchedule() {
  const response = await fetch("/api/admin/schedule", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { schedule?: FulfillmentScheduleConfig; error?: string }
    | null;

  if (!response.ok || !payload?.schedule) {
    throw new Error(payload?.error ?? "Failed to load schedule.");
  }

  return normalizeScheduleConfig(payload.schedule);
}

function uniqSortedSlots(slots: string[]) {
  return Array.from(
    new Set(slots.filter((slot) => typeof slot === "string").map((slot) => slot.trim())),
  )
    .filter(isValidTimeSlot)
    .sort((a, b) => a.localeCompare(b));
}

function getWeekly(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
) {
  return fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
}

function setWeekly(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  nextWeekly: FulfillmentScheduleConfig["pickup"],
): FulfillmentScheduleConfig {
  return fulfillment === "delivery"
    ? { ...schedule, delivery: nextWeekly }
    : { ...schedule, pickup: nextWeekly };
}

function setDaySlots(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  slots: string[],
): FulfillmentScheduleConfig {
  const weekly = fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
  const nextWeekly = {
    ...weekly,
    [day]: uniqSortedSlots(slots),
  };

  return setWeekly(schedule, fulfillment, nextWeekly);
}

function toggleDay(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  open: boolean,
  templateSlots: string[],
): FulfillmentScheduleConfig {
  const weekly = getWeekly(schedule, fulfillment);
  const existing = weekly[day] ?? [];

  if (!open) {
    return setDaySlots(schedule, fulfillment, day, []);
  }

  // If we're opening a closed day, seed it with the current template slots.
  return setDaySlots(
    schedule,
    fulfillment,
    day,
    existing.length > 0 ? existing : templateSlots,
  );
}

function addSlot(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  slot: string,
): FulfillmentScheduleConfig {
  if (!isValidTimeSlot(slot)) {
    return schedule;
  }

  const weekly = getWeekly(schedule, fulfillment);
  const existing = weekly[day] ?? [];
  return setDaySlots(schedule, fulfillment, day, [...existing, slot]);
}

function removeSlot(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  slot: string,
): FulfillmentScheduleConfig {
  const weekly = getWeekly(schedule, fulfillment);
  const existing = weekly[day] ?? [];
  return setDaySlots(
    schedule,
    fulfillment,
    day,
    existing.filter((value) => value !== slot),
  );
}

function copyPickupToDelivery(schedule: FulfillmentScheduleConfig): FulfillmentScheduleConfig {
  return { ...schedule, delivery: { ...schedule.pickup } };
}

function copyDeliveryToPickup(schedule: FulfillmentScheduleConfig): FulfillmentScheduleConfig {
  return { ...schedule, pickup: { ...schedule.delivery } };
}

function getFirstEditableDay(weekly: FulfillmentScheduleConfig["pickup"]): DayKey {
  const firstOpen = DAY_KEYS.find((day) => (weekly[day] ?? []).length > 0);
  return firstOpen ?? "mon";
}

export default function AdminSchedulingManager({ initialSchedule }: Props) {
  const [schedule, setSchedule] = useState<FulfillmentScheduleConfig>(() => normalizeScheduleConfig(initialSchedule));
  const [tab, setTab] = useState<FulfillmentMode>("pickup");
  const [selectedDay, setSelectedDay] = useState<DayKey>(() =>
    getFirstEditableDay(normalizeScheduleConfig(initialSchedule).pickup),
  );
  const [nextSlot, setNextSlot] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const weekly = tab === "delivery" ? schedule.delivery : schedule.pickup;

  const openDaysCount = useMemo(
    () => DAY_KEYS.filter((day) => (weekly[day] ?? []).length > 0).length,
    [weekly],
  );

  const selectedSlots = weekly[selectedDay] ?? [];
  const selectedOpen = selectedSlots.length > 0;
  const slotTemplate = selectedSlots.length > 0 ? selectedSlots : DEFAULT_TEMPLATE_SLOTS;

  async function handleSave() {
    if (busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      const saved = await patchSchedule(schedule);
      setSchedule(saved);
      setSuccess("Saved scheduling settings.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    if (busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      const loaded = await fetchSchedule();
      setSchedule(loaded);
      setSuccess("Schedule refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh schedule.");
    } finally {
      setBusy(false);
    }
  }

  function handleResetDefaults() {
    if (busy) return;
    const confirmed = window.confirm("Reset scheduling to default hours?");
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    setSchedule(getDefaultScheduleConfig());
  }

  function applySlotsToDays(days: DayKey[], slots: string[]) {
    const normalized = uniqSortedSlots(slots);
    setSchedule((prev) => {
      const weeklyPrev = getWeekly(prev, tab);
      const nextWeekly = { ...weeklyPrev };
      for (const day of days) {
        nextWeekly[day] = normalized;
      }
      return setWeekly(prev, tab, nextWeekly);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="feedback-error text-sm p-3 rounded-lg animate-card-enter">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="feedback-success text-sm p-3 rounded-lg animate-card-enter">
          {success}
        </div>
      ) : null}

      <div className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <p className="kicker kicker-blue mb-2">Booking Window</p>
            <label className="admin-label">Customers can schedule up to</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={schedule.maxDaysAhead}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;
                  setSchedule((prev) => normalizeScheduleConfig({ ...prev, maxDaysAhead: value }));
                }}
                inputMode="numeric"
                className="admin-input w-[140px]"
                disabled={busy}
              />
              <span className="text-sm text-fh-muted">days ahead</span>
            </div>
            <p className="text-xs mt-1 text-fh-muted">
              Time zone: <span className="font-semibold">{schedule.timezone}</span>
            </p>

            <div className="mt-6 pt-5 border-t surface-divider">
              <p className="kicker kicker-accent mb-2">Lead Time Rules</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Minimum days ahead</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={schedule.minDaysAhead}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isFinite(value)) return;
                        setSchedule((prev) => normalizeScheduleConfig({ ...prev, minDaysAhead: value }));
                      }}
                      inputMode="numeric"
                      className="admin-input w-[140px]"
                      disabled={busy}
                    />
                    <span className="text-sm text-fh-muted">days</span>
                  </div>
                  <p className="text-xs mt-1 text-fh-muted">
                    Set to <span className="font-semibold">1</span> to block same-day orders.
                  </p>
                </div>

                <div>
                  <label className="admin-label">Next-day cutoff</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-fh-heading font-semibold">
                      <input
                        type="checkbox"
                        checked={schedule.nextDayCutoffTime !== null}
                        onChange={(e) =>
                          setSchedule((prev) =>
                            normalizeScheduleConfig({
                              ...prev,
                              nextDayCutoffTime: e.target.checked
                                ? prev.nextDayCutoffTime && isValidTimeSlot(prev.nextDayCutoffTime)
                                  ? prev.nextDayCutoffTime
                                  : "17:00"
                                : null,
                            }),
                          )
                        }
                        disabled={busy}
                        className="h-4 w-4 accent-[var(--fh-accent-primary)]"
                      />
                      Enable cutoff
                    </label>
                    <input
                      type="time"
                      step={300}
                      value={schedule.nextDayCutoffTime ?? ""}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        setSchedule((prev) =>
                          normalizeScheduleConfig({
                            ...prev,
                            nextDayCutoffTime: value ? value : null,
                          }),
                        );
                      }}
                      disabled={busy || schedule.nextDayCutoffTime === null}
                      className="admin-input w-[160px]"
                    />
                  </div>
                  <p className="text-xs mt-1 text-fh-muted">
                    When enabled, tomorrow becomes unavailable at/after the cutoff time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={busy}
              className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
            >
              Reset defaults
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={busy}
              className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="btn-primary text-xs py-2.5 px-4 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="p-5 border-b surface-divider flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="kicker kicker-accent mb-2">Available Time Slots</p>
            <h2 className="text-2xl font-bold text-fh-heading">
              {tab === "pickup" ? "Pickup" : "Delivery"} hours
            </h2>
            <p className="text-sm text-fh-muted mt-1">
              Open days: <span className="font-semibold text-fh-heading">{openDaysCount}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTab("pickup")}
              className={tab === "pickup" ? "btn-admin-nav-active text-xs py-2 px-4" : "btn-admin-nav text-xs py-2 px-4"}
              disabled={busy}
            >
              Pickup
            </button>
            <button
              type="button"
              onClick={() => setTab("delivery")}
              className={tab === "delivery" ? "btn-admin-nav-active text-xs py-2 px-4" : "btn-admin-nav text-xs py-2 px-4"}
              disabled={busy}
            >
              Delivery
            </button>
            <button
              type="button"
              onClick={() => setSchedule((prev) => copyPickupToDelivery(prev))}
              className="btn-admin-nav text-xs py-2 px-4 disabled:opacity-50"
              disabled={busy}
              title="Copy pickup schedule to delivery"
            >
              Copy pickup → delivery
            </button>
            <button
              type="button"
              onClick={() => setSchedule((prev) => copyDeliveryToPickup(prev))}
              className="btn-admin-nav text-xs py-2 px-4 disabled:opacity-50"
              disabled={busy}
              title="Copy delivery schedule to pickup"
            >
              Copy delivery → pickup
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <p className="admin-label mb-2">Pick a day</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-2 gap-2">
              {DAY_KEYS.map((day) => {
                const slots = weekly[day] ?? [];
                const isOpen = slots.length > 0;
                const isSelected = day === selectedDay;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={
                      isSelected
                        ? "btn-admin-nav-active w-full text-left px-3 py-3"
                        : "btn-admin-nav w-full text-left px-3 py-3"
                    }
                    disabled={busy}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-fh-heading">
                        {DAY_LABELS[day].slice(0, 3)}
                      </span>
                      <span className={isOpen ? "text-xs text-fh-accent-blue" : "text-xs text-fh-muted"}>
                        {isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-fh-muted">
                      {isOpen ? `${slots.length} slot${slots.length === 1 ? "" : "s"}` : "No bookings"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 surface-soft p-4">
              <p className="kicker kicker-blue mb-2">Quick actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applySlotsToDays(WEEKDAYS, slotTemplate)}
                  disabled={busy || slotTemplate.length === 0}
                  className="btn-admin-nav text-xs py-2.5 px-3 disabled:opacity-50"
                >
                  Apply to weekdays
                </button>
                <button
                  type="button"
                  onClick={() => applySlotsToDays(WEEKENDS, slotTemplate)}
                  disabled={busy || slotTemplate.length === 0}
                  className="btn-admin-nav text-xs py-2.5 px-3 disabled:opacity-50"
                >
                  Apply to weekends
                </button>
                <button
                  type="button"
                  onClick={() => applySlotsToDays(DAY_KEYS, slotTemplate)}
                  disabled={busy || slotTemplate.length === 0}
                  className="btn-admin-nav text-xs py-2.5 px-3 disabled:opacity-50"
                >
                  Apply to all days
                </button>
                <button
                  type="button"
                  onClick={() => applySlotsToDays(DAY_KEYS, [])}
                  disabled={busy}
                  className="btn-admin-nav text-xs py-2.5 px-3 disabled:opacity-50"
                >
                  Close all days
                </button>
              </div>
              <p className="text-[11px] mt-3 text-fh-muted leading-relaxed">
                Tip: Select a day, set its slots, then use the quick actions above to copy that setup.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="surface-soft p-5">
              <p className="kicker kicker-accent mb-2">Editing</p>
              <h3 className="text-xl font-bold text-fh-heading">
                {DAY_LABELS[selectedDay]} ({tab === "pickup" ? "Pickup" : "Delivery"})
              </h3>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-3 text-sm text-fh-heading font-semibold">
                  <input
                    type="checkbox"
                    checked={selectedOpen}
                    onChange={(e) =>
                      setSchedule((prev) => toggleDay(prev, tab, selectedDay, e.target.checked, slotTemplate))
                    }
                    disabled={busy}
                    className="h-4 w-4 accent-[var(--fh-accent-primary)]"
                    aria-label={`Toggle ${DAY_LABELS[selectedDay]}`}
                  />
                  Open for {tab === "pickup" ? "pickup" : "delivery"}
                </label>

                {selectedOpen ? (
                  <button
                    type="button"
                    onClick={() => setSchedule((prev) => setDaySlots(prev, tab, selectedDay, []))}
                    disabled={busy}
                    className="btn-admin-logout text-xs py-2 px-3 disabled:opacity-50"
                  >
                    Close day
                  </button>
                ) : null}
              </div>

              {selectedOpen ? (
                <>
                  <div className="mt-4">
                    <p className="admin-label mb-2">Time slots</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedSlots.map((slot) => (
                        <span
                          key={`${selectedDay}-${slot}`}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border surface-divider text-sm text-fh-heading"
                        >
                          {formatTimeSlotLabel(slot)}
                          <button
                            type="button"
                            onClick={() => setSchedule((prev) => removeSlot(prev, tab, selectedDay, slot))}
                            className="btn-remove text-xs px-2 py-0.5"
                            disabled={busy}
                            aria-label={`Remove ${slot}`}
                            title="Remove slot"
                          >
                            &times;
                          </button>
                        </span>
                      ))}

                      {selectedSlots.length === 0 ? (
                        <p className="text-sm text-fh-muted">No slots yet. Add one below.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex items-end gap-2 flex-wrap">
                    <div>
                      <label className="admin-label">Add a time</label>
                      <input
                        type="time"
                        value={nextSlot}
                        onChange={(e) => setNextSlot(e.target.value)}
                        className="admin-input w-[160px]"
                        disabled={busy}
                        step={300}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const slot = nextSlot.trim();
                        if (!isValidTimeSlot(slot)) return;
                        setSchedule((prev) => addSlot(prev, tab, selectedDay, slot));
                      }}
                      className="btn-primary text-xs py-2.5 px-4 disabled:opacity-50"
                      disabled={busy}
                    >
                      Add slot
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-fh-muted">
                    This day is closed. Toggle it on to add available pickup/delivery times.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
