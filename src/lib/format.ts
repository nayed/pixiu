// Small text helpers for times. Pure, so they can be tested with a fixed clock.

const MINUTE = 60_000;

function parts(ms: number): string {
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
  return ms <= 0 ? "any moment" : `in ${parts(ms)}`;
}

/** "12 min ago", or "just now" under a minute. */
export function agoText(iso: string, now: Date): string {
  const ms = now.getTime() - Date.parse(iso);
  return ms < MINUTE ? "just now" : `${parts(ms)} ago`;
}
