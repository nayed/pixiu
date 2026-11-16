// Small text helpers for times. Pure, so they can be tested with a fixed clock.

const MINUTE = 60_000;

/** A length of time in its two largest units: "3 d 4 h", "2 h 10 min", "25 min". */
export function durationText(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / MINUTE));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${rest} min`;
  return `${rest} min`;
}

/** "in 2 h 10 min", or "any moment" once the time has passed. */
export function untilText(iso: string, now: Date): string {
  const ms = Date.parse(iso) - now.getTime();
  return ms <= 0 ? "any moment" : `in ${durationText(ms)}`;
}

/** "12 min ago", or "just now" under a minute. */
export function agoText(iso: string, now: Date): string {
  const ms = now.getTime() - Date.parse(iso);
  return ms < MINUTE ? "just now" : `${durationText(ms)} ago`;
}

/** The time left until an instant, as a length: "2 h 10 min". Zero once it has passed. */
export function timeLeftText(iso: string, now: Date): string {
  return durationText(Date.parse(iso) - now.getTime());
}

/** Minutes after midnight as "HH:MM", the value of a time input. */
export function minutesToClock(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "HH:MM" as minutes after midnight, or null if it is not a time. */
export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes < 24 * 60 && Number(match[2]) < 60 ? minutes : null;
}
