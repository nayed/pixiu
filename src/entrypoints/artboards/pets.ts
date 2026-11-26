// The pets on the artboards. Each is built by hand at a fixed moment, so the pictures come out
// the same every time: the same countdowns, the same moods, whatever the date or time zone.

import type { Settings } from "@/lib/pet/config";
import { newPet, type PetState } from "@/lib/pet/state";
import type { UsageFailureReason } from "@/lib/usage/snapshot";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const NOW = new Date("2026-11-19T13:50:00Z");
const at = (fromNow: number) => new Date(NOW.getTime() + fromNow).toISOString();

/** No sleeping hours, so hunger does not depend on the time zone the pictures are taken in. */
export const SETTINGS: Settings = { sleep: { startMinute: 0, endMinute: 0 } };

/** A read with these percents, and the countdowns the mockups showed. */
const reading = (session: number, week: number, minutesAgo: number) => ({
  ok: true as const,
  readAt: at(-minutesAgo * MINUTE),
  short: { percent: session, resetsAt: at(2 * HOUR + 10 * MINUTE) },
  long: { percent: week, resetsAt: at(3 * DAY + 4 * HOUR) },
});

/** An egg with this much warmth, out of the 10 it needs. */
export function egg(warmth: number, blind: UsageFailureReason | null = null): PetState {
  return {
    ...newPet(new Date(at(-DAY))),
    warmth,
    reading: blind === "not-set-up" ? null : reading(warmth, 41, 1),
    blind,
    lastBite: warmth > 0 ? { at: at(-40 * MINUTE), points: warmth } : null,
    lastMealAt: warmth > 0 ? at(-40 * MINUTE) : null,
    weekEndsAt: at(3 * DAY + 4 * HOUR),
    weekPeak: 41,
  };
}

type Look = {
  age?: number;
  xp?: number;
  name?: string | null;
  mood?: "happy" | "eating" | "hungry" | "stuffed" | "sulky";
  session?: number;
  /** The weekly percent, which sets the ruler's color. */
  week?: number;
  ranAway?: boolean;
  blind?: UsageFailureReason | null;
  /** How long ago the last read that worked was. */
  seenMinutesAgo?: number;
};

/** A hatched pet, named Pixiu, in the mood asked for. */
export function pet(look: Look = {}): PetState {
  const { age = 6, xp = 0, name = "Pixiu", mood = "happy", session = 62, week = 41 } = look;
  const ateAt =
    mood === "eating" ? at(-MINUTE) : mood === "hungry" ? at(-7 * HOUR) : at(-40 * MINUTE);
  return {
    ...newPet(new Date(at(-60 * DAY))),
    name,
    warmth: 10,
    hatchedAt: at(-50 * DAY),
    age,
    xp,
    reading: reading(mood === "stuffed" ? 100 : session, week, look.seenMinutesAgo ?? 1),
    blind: look.blind ?? null,
    lastMealAt: ateAt,
    hungerMs: Date.parse(at(-(look.seenMinutesAgo ?? 1) * MINUTE)) - Date.parse(ateAt),
    lastBite: { at: ateAt, points: 12 },
    weekEndsAt: at(3 * DAY + 4 * HOUR),
    weekPeak: week,
    // Thin weeks for the sulky pet, good ones for everyone else.
    weeks: mood === "sulky" ? [12, 9, 14] : [64, 71, 58],
    ranAway: look.ranAway ?? false,
  };
}

/**
 * What each stage's pictures show: partway to the next age, and a weekly percent in each of
 * the ruler's four colors, from green for the baby to red for the adult.
 */
export const STAGES = {
  baby: { age: 0, xp: 21, week: 18 },
  child: { age: 6, xp: 48, week: 41 },
  teen: { age: 9, xp: 77, week: 82 },
  adult: { age: 14, xp: 120, week: 94 },
} as const;
