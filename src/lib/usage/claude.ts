// The Claude adapter: the only code that knows about claude.ai and its usage response.
// The address is undocumented and its shape changes, so every field is treated as possibly
// missing and nothing here throws.

import type { UsageFailureReason, UsageSnapshot, UsageWindow } from "./snapshot";

export const ORG_ID_PATTERN =
  /\/api\/organizations\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function usageUrl(orgId: string): string {
  return `https://claude.ai/api/organizations/${orgId}/usage`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPercent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Returns a normalized ISO time, null for "no reset scheduled", or undefined if unreadable. */
function toResetTime(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function toWindow(percentValue: unknown, resetValue: unknown): UsageWindow | null {
  const percent = toPercent(percentValue);
  const resetsAt = toResetTime(resetValue);
  if (percent === null || resetsAt === undefined) return null;
  return { percent, resetsAt };
}

function fromLimits(json: Record<string, unknown>, kind: string): UsageWindow | null {
  if (!Array.isArray(json.limits)) return null;
  const entry = json.limits.find((limit) => isRecord(limit) && limit.kind === kind);
  return isRecord(entry) ? toWindow(entry.percent, entry.resets_at) : null;
}

function fromLegacy(json: Record<string, unknown>, key: string): UsageWindow | null {
  const entry = json[key];
  return isRecord(entry) ? toWindow(entry.utilization, entry.resets_at) : null;
}

/** Turns a parsed usage response into a snapshot. Prefers `limits`, falls back to the older keys. */
export function parseUsage(json: unknown, readAt: string): UsageSnapshot {
  if (!isRecord(json)) return { ok: false, readAt, reason: "changed" };

  const short = fromLimits(json, "session") ?? fromLegacy(json, "five_hour");
  const long = fromLimits(json, "weekly_all") ?? fromLegacy(json, "seven_day");
  if (!long) return { ok: false, readAt, reason: "changed" };

  // Some accounts have no five-hour limit. What the pet does then is undecided (MVP.md,
  // question 14); until it is, a missing session reads as "no session running".
  return { ok: true, readAt, short: short ?? { percent: 0, resetsAt: null }, long };
}

function failure(readAt: string, reason: UsageFailureReason): UsageSnapshot {
  return { ok: false, readAt, reason };
}

/** One usage read. Never throws: every failure becomes a snapshot with a reason. */
export async function readUsage(
  orgId: string | null | undefined,
  fetchFn: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<UsageSnapshot> {
  const readAt = now().toISOString();
  if (!orgId) return failure(readAt, "not-set-up");

  let response: Response;
  let text: string;
  try {
    response = await fetchFn(usageUrl(orgId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    text = await response.text();
  } catch {
    return failure(readAt, "offline");
  }

  if (response.status === 401 || response.status === 403) return failure(readAt, "signed-out");
  // Any other error status (rate limit, server error) is a passing problem on the way to
  // Claude, which is what "offline" means to the pet.
  if (!response.ok) return failure(readAt, "offline");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // A page instead of JSON: most likely a login page or a bot check.
    return failure(readAt, "signed-out");
  }
  return parseUsage(json, readAt);
}
