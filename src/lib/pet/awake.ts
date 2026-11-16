import type { SleepHours } from "./config";

function localTime(day: Date, minute: number, plusDays = 0): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + plusDays, 0, minute).getTime();
}

/**
 * The waking time between two instants: the span minus every sleeping period inside it.
 * Sleeping hours are in local time, so this follows the browser's time zone.
 */
export function awakeMs(fromMs: number, toMs: number, sleep: SleepHours): number {
  if (toMs <= fromMs) return 0;
  if (sleep.startMinute === sleep.endMinute) return toMs - fromMs;

  const endsNextDay = sleep.endMinute < sleep.startMinute;
  let asleep = 0;
  // Start a day early: a night that began yesterday can still cover the start of the span.
  const day = new Date(fromMs);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - 1);
  for (; day.getTime() < toMs; day.setDate(day.getDate() + 1)) {
    const start = localTime(day, sleep.startMinute);
    const end = localTime(day, sleep.endMinute, endsNextDay ? 1 : 0);
    asleep += Math.max(0, Math.min(end, toMs) - Math.max(start, fromMs));
  }
  return toMs - fromMs - asleep;
}
