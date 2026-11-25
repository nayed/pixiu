// A stand-in for Claude's usage numbers, for tests and the debug page. It follows what the
// data test saw: a session opens on first use and resets five hours later, the week resets on
// a fixed schedule, and a full session is worth about 18% of the week.

import { WEEK_MS } from "../pet/config";
import type { UsageFailureReason, UsageSnapshot } from "../usage/snapshot";

const SESSION_MS = 5 * 60 * 60_000;
const WEEK_POINTS_PER_SESSION_POINT = 0.18;

export type FakeClaude = {
  now: number;
  session: { percent: number; resetsAt: number | null };
  week: { percent: number; resetsAt: number };
  /** When set, every read fails with this reason. */
  failure: UsageFailureReason | null;
};

export function createFakeClaude(now: Date, weekResetsAt: Date): FakeClaude {
  return {
    now: now.getTime(),
    session: { percent: 0, resetsAt: null },
    week: { percent: 0, resetsAt: weekResetsAt.getTime() },
    failure: null,
  };
}

/** Moves the clock forward and applies any resets that fall due. */
export function advance(fake: FakeClaude, ms: number): FakeClaude {
  const now = fake.now + ms;
  let { session, week } = fake;
  if (session.resetsAt !== null && now >= session.resetsAt) {
    session = { percent: 0, resetsAt: null };
  }
  if (now >= week.resetsAt) {
    const weeksPassed = 1 + Math.floor((now - week.resetsAt) / WEEK_MS);
    week = { percent: 0, resetsAt: week.resetsAt + weeksPassed * WEEK_MS };
  }
  return { ...fake, now, session, week };
}

/** Uses Claude: adds session points, up to the session limit, and the matching weekly share. */
export function use(fake: FakeClaude, sessionPoints: number): FakeClaude {
  const points = Math.max(0, Math.min(sessionPoints, 100 - fake.session.percent));
  if (points === 0) return fake;
  return {
    ...fake,
    session: {
      percent: fake.session.percent + points,
      resetsAt: fake.session.resetsAt ?? fake.now + SESSION_MS,
    },
    week: {
      ...fake.week,
      percent: Math.min(100, fake.week.percent + points * WEEK_POINTS_PER_SESSION_POINT),
    },
  };
}

/**
 * Adds weekly points directly, up to the weekly limit, without touching the session. Real use
 * always moves both; this is a shortcut for the debug page and tests, to earn XP quickly.
 */
export function useWeek(fake: FakeClaude, weekPoints: number): FakeClaude {
  const percent = Math.min(100, fake.week.percent + Math.max(0, weekPoints));
  return { ...fake, week: { ...fake.week, percent } };
}

/** One usage read, in the same shape the Claude adapter produces. */
export function read(fake: FakeClaude): UsageSnapshot {
  const readAt = new Date(fake.now).toISOString();
  if (fake.failure) return { ok: false, readAt, reason: fake.failure };
  const { session, week } = fake;
  return {
    ok: true,
    readAt,
    short: {
      percent: Math.round(session.percent),
      resetsAt: session.resetsAt === null ? null : new Date(session.resetsAt).toISOString(),
    },
    long: {
      percent: Math.round(week.percent),
      resetsAt: new Date(week.resetsAt).toISOString(),
    },
  };
}
