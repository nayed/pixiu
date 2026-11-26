import type { UsageFailureReason, UsageReading } from "../usage/snapshot";

/** Everything the pet remembers. Plain JSON, so it can be saved to storage as it is. */
export type PetState = {
  version: 3;
  /** When the egg appeared: the first run after install. */
  bornAt: string;
  /** Null until the user names the pet, which can only happen after it hatches. */
  name: string | null;
  /** Session points eaten since install. Never drops. The egg hatches at RULES.hatchWarmth. */
  warmth: number;
  hatchedAt: string | null;
  /** Birthdays since hatching. Each one is bought with XP; see growth.ts. */
  age: number;
  /** XP earned toward the next age: weekly points since hatching, less what earlier ages cost. */
  xp: number;
  /** The most recent birthday: when, the age it reached, and the age before it. */
  lastBirthday: { at: string; age: number; fromAge: number } | null;

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
    version: 3,
    bornAt: now.toISOString(),
    name: null,
    warmth: 0,
    hatchedAt: null,
    age: 0,
    xp: 0,
    lastBirthday: null,
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

/** The pet as version 0.2.0 saved it, before it remembered its last birthday. */
export type PetStateV2 = Omit<PetState, "version" | "lastBirthday"> & { version: 2 };

/** The pet as version 0.1.0 saved it, when the weekly reset was a birthday and there was no XP. */
export type PetStateV1 = Omit<PetStateV2, "version" | "xp"> & { version: 1 };

/**
 * Brings a pet saved by an older version up to date.
 *
 * A version 1 pet keeps its age and is credited the weekly usage it has seen this week as XP.
 * If that pays for the next age, it has a birthday at its next read. A pet that hatched this
 * week is also credited the part of the week from before it hatched, which the old rules would
 * have rewarded at the reset anyway.
 *
 * Older pets have no birthday on record, so nothing celebrates by surprise after an update.
 */
export function upgradePet(pet: PetState | PetStateV2 | PetStateV1): PetState {
  if (pet.version === 1) {
    return {
      ...pet,
      version: 3,
      xp: pet.hatchedAt === null ? 0 : pet.weekPeak,
      lastBirthday: null,
    };
  }
  if (pet.version === 2) return { ...pet, version: 3, lastBirthday: null };
  return pet;
}
