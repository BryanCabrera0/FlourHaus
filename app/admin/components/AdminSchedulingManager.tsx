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
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type Props = {
  initialSchedule: FulfillmentScheduleConfig;
};

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

function toggleDay(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  open: boolean,
): FulfillmentScheduleConfig {
  const weekly = fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
  const nextWeekly = {
    ...weekly,
    [day]: open ? (weekly[day]?.length ? weekly[day] : ["10:00"]) : [],
  };

  return fulfillment === "delivery"
    ? { ...schedule, delivery: nextWeekly }
    : { ...schedule, pickup: nextWeekly };
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

  const weekly = fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
  const existing = weekly[day] ?? [];
  const next = Array.from(new Set([...existing, slot])).sort((a, b) => a.localeCompare(b));

  const nextWeekly = {
    ...weekly,
    [day]: next,
  };

  return fulfillment === "delivery"
    ? { ...schedule, delivery: nextWeekly }
    : { ...schedule, pickup: nextWeekly };
}

function removeSlot(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  day: DayKey,
  slot: string,
): FulfillmentScheduleConfig {
  const weekly = fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
  const nextWeekly = {
    ...weekly,
    [day]: (weekly[day] ?? []).filter((value) => value !== slot),
  };

  return fulfillment === "delivery"
    ? { ...schedule, delivery: nextWeekly }
    : { ...schedule, pickup: nextWeekly };
}

function copyPickupToDelivery(schedule: FulfillmentScheduleConfig): FulfillmentScheduleConfig {
  return { ...schedule, delivery: { ...schedule.pickup } };
}

export default function AdminSchedulingManager({ initialSchedule }: Props) {
  const [schedule, setSchedule] = useState<FulfillmentScheduleConfig>(() =>
    normalizeScheduleConfig(initialSchedule),
  );
  const [tab, setTab] = useState<FulfillmentMode>("pickup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const weekly = tab === "delivery" ? schedule.delivery : schedule.pickup;

  const openDaysCount = useMemo(
    () => DAY_KEYS.filter((day) => (weekly[day] ?? []).length > 0).length,
    [weekly],
  );

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
            <p className="kicker kicker-blue mb-2">Customer Booking Window</p>
            <label className="admin-label">Days ahead customers can schedule</label>
            <input
              value={schedule.maxDaysAhead.toString()}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isFinite(value)) return;
                setSchedule((prev) =>
                  normalizeScheduleConfig({ ...prev, maxDaysAhead: value }),
                );
              }}
              inputMode="numeric"
              className="admin-input max-w-[180px]"
              disabled={busy}
            />
            <p className="text-xs mt-1 text-fh-muted">
              Time zone: <span className="font-semibold">{schedule.timezone}</span>
            </p>
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
          </div>
        </div>

        <div className="divide-y surface-divider">
          {DAY_KEYS.map((day) => {
            const slots = weekly[day] ?? [];
            const isOpen = slots.length > 0;

            return (
              <ScheduleDayRow
                key={day}
                day={day}
                label={DAY_LABELS[day]}
                slots={slots}
                isOpen={isOpen}
                disabled={busy}
                onToggle={(open) => setSchedule((prev) => toggleDay(prev, tab, day, open))}
                onAdd={(slot) => setSchedule((prev) => addSlot(prev, tab, day, slot))}
                onRemove={(slot) => setSchedule((prev) => removeSlot(prev, tab, day, slot))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScheduleDayRow({
  day,
  label,
  slots,
  isOpen,
  disabled,
  onToggle,
  onAdd,
  onRemove,
}: {
  day: DayKey;
  label: string;
  slots: string[];
  isOpen: boolean;
  disabled: boolean;
  onToggle: (open: boolean) => void;
  onAdd: (slot: string) => void;
  onRemove: (slot: string) => void;
}) {
  const [nextSlot, setNextSlot] = useState("10:00");

  return (
    <div className="p-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-[180px]">
        <label className="flex items-center gap-3 text-sm text-fh-heading font-semibold">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-[var(--fh-accent-primary)]"
            aria-label={`Toggle ${label}`}
          />
          {label}
        </label>
        <p className="text-xs text-fh-muted mt-1">
          {isOpen ? `${slots.length} slot${slots.length === 1 ? "" : "s"}` : "Closed"}
        </p>
      </div>

      <div className="flex-1">
        {isOpen ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {slots.map((slot) => (
                <span
                  key={`${day}-${slot}`}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border surface-divider text-sm text-fh-heading"
                >
                  {formatTimeSlotLabel(slot)}
                  <button
                    type="button"
                    onClick={() => onRemove(slot)}
                    className="btn-remove text-xs px-2 py-0.5"
                    disabled={disabled}
                    aria-label={`Remove ${slot}`}
                    title="Remove slot"
                  >
                    &times;
                  </button>
                </span>
              ))}

              {slots.length === 0 ? (
                <p className="text-sm text-fh-muted">
                  No slots yet. Add one below.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex items-end gap-2 flex-wrap">
              <div>
                <label className="admin-label">Add a time</label>
                <input
                  type="time"
                  value={nextSlot}
                  onChange={(e) => setNextSlot(e.target.value)}
                  className="admin-input w-[160px]"
                  disabled={disabled}
                  step={300}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const slot = nextSlot.trim();
                  if (!isValidTimeSlot(slot)) {
                    return;
                  }
                  onAdd(slot);
                }}
                className="btn-admin-nav text-xs py-2.5 px-4 disabled:opacity-50"
                disabled={disabled}
              >
                Add slot
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-fh-muted">
            Turn this day on to add slots.
          </p>
        )}
      </div>
    </div>
  );
}

