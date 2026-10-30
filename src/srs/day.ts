// A study day starts at 04:00 local time (the Anki rule), so a session at 01:00
// still counts for the evening before.

export const DAY_STARTS_AT_HOUR = 4;

/** The start of the study day that `now` belongs to. */
export function startOfDay(now: Date): Date {
  const start = new Date(now);
  start.setHours(DAY_STARTS_AT_HOUR, 0, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1);
  return start;
}

/** The first moment of the next study day. Cards due before it are due "today". */
export function endOfDay(now: Date): Date {
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);
  return end;
}

/** "2026-10-30" for the study day `now` belongs to. */
export function dayKey(now: Date): string {
  const start = startOfDay(now);
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${month}-${day}`;
}

/** The day key `days` study days before (or after, if negative) `key`. */
export function shiftDay(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) - days, 12);
  return dayKey(new Date(date.getTime() + DAY_STARTS_AT_HOUR * 60 * 60 * 1000));
}

/** Days in a row with practice, ending today, or yesterday if today has none yet. */
export function streak(practisedDays: ReadonlySet<string>, now: Date): number {
  let key = dayKey(now);
  if (!practisedDays.has(key)) key = shiftDay(key, 1);
  let count = 0;
  while (practisedDays.has(key)) {
    count++;
    key = shiftDay(key, 1);
  }
  return count;
}
