export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type FulfillmentMode = "pickup" | "delivery";

export const DAY_KEYS: DayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const STORE_TIME_ZONE = "America/New_York";

export type WeeklySlots = Record<DayKey, string[]>;

export type FulfillmentScheduleConfigV1 = {
  version: 1;
  timezone: string;
  /**
   * Minimum number of days from "today" (in the store timezone) that customers
   * are allowed to schedule. Example: 1 => no same-day orders.
   */
  minDaysAhead: number;
  maxDaysAhead: number;
  /**
   * If set, "tomorrow" becomes unavailable once the current time (store timezone)
   * is at/after this cutoff. Example: "17:00" => next-day orders close at 5pm.
   * Use null to disable this extra rule.
   */
  nextDayCutoffTime: string | null;
  pickup: WeeklySlots;
  delivery: WeeklySlots;
};

export type FulfillmentScheduleConfig = FulfillmentScheduleConfigV1;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function uniqSorted(list: string[]) {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
}

export function isValidTimeSlot(value: string) {
  return TIME_RE.test(value);
}

export function isValidDateString(value: string) {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map((part) => Number(part));
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function getDefaultScheduleConfig(): FulfillmentScheduleConfig {
  const defaultSlots = ["10:00", "12:00", "14:00", "16:00", "18:00"];
  const weekly = DAY_KEYS.reduce((acc, day) => {
    acc[day] = [...defaultSlots];
    return acc;
  }, {} as WeeklySlots);

  return {
    version: 1,
    timezone: STORE_TIME_ZONE,
    minDaysAhead: 1,
    maxDaysAhead: 21,
    nextDayCutoffTime: "17:00",
    pickup: weekly,
    delivery: weekly,
  };
}

function normalizeWeeklySlots(value: unknown): WeeklySlots {
  const fallback = DAY_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {} as WeeklySlots);

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const obj = value as Record<string, unknown>;
  for (const day of DAY_KEYS) {
    const raw = obj[day];
    const list = Array.isArray(raw)
      ? raw.filter((entry): entry is string => typeof entry === "string")
      : [];
    const normalized = uniqSorted(
      list.map((slot) => slot.trim()).filter(isValidTimeSlot),
    );
    fallback[day] = normalized;
  }

  return fallback;
}

export function normalizeScheduleConfig(value: unknown): FulfillmentScheduleConfig {
  const defaults = getDefaultScheduleConfig();
  if (typeof value !== "object" || value === null) {
    return defaults;
  }

  const obj = value as Record<string, unknown>;
  const version = obj.version === 1 ? 1 : 1;

  const minDaysAheadRaw =
    typeof obj.minDaysAhead === "number" ? obj.minDaysAhead : Number(obj.minDaysAhead);
  const minDaysAhead = Number.isInteger(minDaysAheadRaw)
    ? Math.min(60, Math.max(0, minDaysAheadRaw))
    : defaults.minDaysAhead;

  const maxDaysAheadRaw =
    typeof obj.maxDaysAhead === "number" ? obj.maxDaysAhead : Number(obj.maxDaysAhead);
  const maxDaysAhead = Number.isInteger(maxDaysAheadRaw)
    ? Math.min(60, Math.max(1, maxDaysAheadRaw))
    : defaults.maxDaysAhead;

  const nextDayCutoffInput = obj.nextDayCutoffTime;
  const nextDayCutoffNormalized =
    nextDayCutoffInput === null
      ? null
      : typeof nextDayCutoffInput === "string"
        ? nextDayCutoffInput.trim()
        : undefined;

  const nextDayCutoffTime =
    nextDayCutoffNormalized === null
      ? null
      : nextDayCutoffNormalized && isValidTimeSlot(nextDayCutoffNormalized)
        ? nextDayCutoffNormalized
        : defaults.nextDayCutoffTime;

  return {
    version,
    timezone: STORE_TIME_ZONE,
    minDaysAhead,
    maxDaysAhead,
    nextDayCutoffTime,
    pickup: normalizeWeeklySlots(obj.pickup),
    delivery: normalizeWeeklySlots(obj.delivery),
  };
}

export function addDays(dateString: string, days: number): string | null {
  if (!isValidDateString(dateString) || !Number.isInteger(days)) {
    return null;
  }
  const [y, m, d] = dateString.split("-").map((part) => Number(part));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getTodayDateString(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const byType = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function getNowTimeString(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const byType = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${byType.hour}:${byType.minute}`;
}

export function getMinAllowedDateString(
  schedule: FulfillmentScheduleConfig,
  now = new Date(),
): string {
  const today = getTodayDateString(schedule.timezone, now);
  const baseMin =
    typeof schedule.minDaysAhead === "number" && Number.isInteger(schedule.minDaysAhead)
      ? Math.min(60, Math.max(0, schedule.minDaysAhead))
      : 0;

  const baseMinDate = addDays(today, baseMin) ?? today;

  const tomorrow = addDays(today, 1);
  const cutoff = schedule.nextDayCutoffTime;
  if (!tomorrow || baseMinDate !== tomorrow || !cutoff || !isValidTimeSlot(cutoff)) {
    return baseMinDate;
  }

  const nowTime = getNowTimeString(schedule.timezone, now);
  if (nowTime >= cutoff) {
    return addDays(today, 2) ?? baseMinDate;
  }

  return baseMinDate;
}

export function dateIsWithinRange(
  schedule: FulfillmentScheduleConfig,
  dateString: string,
  now = new Date(),
): boolean {
  if (!isValidDateString(dateString)) return false;

  const today = getTodayDateString(schedule.timezone, now);
  const earliest = getMinAllowedDateString(schedule, now);
  const latest = addDays(today, schedule.maxDaysAhead);
  if (!latest) return false;

  return dateString >= earliest && dateString <= latest;
}

export function getDayKeyFromDate(dateString: string): DayKey | null {
  if (!isValidDateString(dateString)) return null;
  const [y, m, d] = dateString.split("-").map((part) => Number(part));
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  switch (day) {
    case 0:
      return "sun";
    case 1:
      return "mon";
    case 2:
      return "tue";
    case 3:
      return "wed";
    case 4:
      return "thu";
    case 5:
      return "fri";
    case 6:
      return "sat";
    default:
      return null;
  }
}

export function getSlotsForDate(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  dateString: string,
  now = new Date(),
): string[] {
  if (!dateIsWithinRange(schedule, dateString, now)) return [];
  const dayKey = getDayKeyFromDate(dateString);
  if (!dayKey) return [];
  const weekly = fulfillment === "delivery" ? schedule.delivery : schedule.pickup;
  return weekly[dayKey] ?? [];
}

export function isSlotAvailable(
  schedule: FulfillmentScheduleConfig,
  fulfillment: FulfillmentMode,
  dateString: string,
  timeSlot: string,
  now = new Date(),
): boolean {
  if (!isValidTimeSlot(timeSlot)) return false;
  return getSlotsForDate(schedule, fulfillment, dateString, now).includes(timeSlot);
}

export function formatTimeSlotLabel(timeSlot: string): string {
  if (!isValidTimeSlot(timeSlot)) return timeSlot;
  const [hourRaw, minuteRaw] = timeSlot.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timeSlot;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minuteText = minute.toString().padStart(2, "0");
  return `${hour12}:${minuteText} ${period}`;
}

export function formatDateLabel(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  const [y, m, d] = dateString.split("-").map((part) => Number(part));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}
