import type { UsageFailureReason, UsageReading } from "../usage/snapshot";

/** Everything the pet remembers. Plain JSON, so it can be saved to storage as it is. */
export type PetState = {
  version: 1;
  /** When the egg appeared: the first run after install. */
  bornAt: string;
  /** Null until the user names the pet, which can only happen after it hatches. */
  name: string | null;
  /** Session points eaten since install. Never drops. The egg hatches at RULES.hatchWarmth. */
  warmth: number;
  hatchedAt: string | null;
  /** Birthdays since hatching. One weekly reset is one year. */
  age: number;

  /** The last successful usage read. */
  reading: UsageReading | null;
  /** Why the pet can't see usage right now, or null when it can. */
  blind: UsageFailureReason | null;

  lastMealAt: string | null;
  /** Waking time without a meal, counted up to the last successful read or the start of an outage. */
  hungerMs: number;
  /** The latest rise in usage, for the eating animation. */
  lastBite: { at: string; points: number } | null;

  /** When the current week ends, from the usage read. */
  weekEndsAt: string | null;
  /** The highest weekly percent seen in the current week. */
  weekPeak: number;
  /** Peaks of the completed weeks since hatching, oldest first. Only the most recent are kept. */
  weeks: number[];
  ranAway: boolean;
};

export function newPet(now: Date): PetState {
  return {
    version: 1,
    bornAt: now.toISOString(),
    name: null,
    warmth: 0,
    hatchedAt: null,
    age: 0,
    reading: null,
    blind: null,
    lastMealAt: null,
    hungerMs: 0,
    lastBite: null,
    weekEndsAt: null,
    weekPeak: 0,
    weeks: [],
    ranAway: false,
  };
}
