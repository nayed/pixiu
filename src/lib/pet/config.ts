// The numbers behind the pet's rules, in one place so they are easy to change.
// docs/RULES.md and docs/MVP.md say which are decided and which are only proposed.

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const WEEK_MS = 7 * 24 * HOUR_MS;

export const RULES = {
  /** Session points the egg must eat before it hatches: one cookie. */
  hatchWarmth: 10,
  /** Warmth at which the first crack and the full crack appear. */
  firstCrackWarmth: 4,
  fullCrackWarmth: 9,

  /** Waking time without a meal before the pet is hungry. */
  hungryAfterMs: 6 * HOUR_MS,
  /** How long the pet keeps eating after the percent rises. One poll, so steady use reads as one meal. */
  eatingMs: 5 * MINUTE_MS,

  /** Condition looks at the peaks of this many completed weeks. */
  conditionWeeks: 4,
  /** No sulking before this many weeks of history. */
  sulkyMinWeeks: 2,
  /** Sulky when the average weekly peak is under this percent. */
  sulkyBelowPercent: 25,

  /** A week is empty when its peak stays under this percent. */
  emptyWeekBelowPercent: 5,
  /** This many empty weeks in a row and the pet runs away. */
  emptyWeeksToRunAway: 2,

  /** XP a newly hatched pet needs to reach age 1. Each point the weekly percent rises is 1 XP. */
  firstAgeXp: 50,
  /** How much more XP each later age costs than the one before. */
  extraXpPerAge: 10,
  /** How long the pet celebrates after a birthday. */
  celebrationMs: 24 * HOUR_MS,

  /** The age at which each stage starts. The baby is age 0. */
  childAge: 1,
  teenAge: 7,
  adultAge: 12,

  maxNameLength: 12,
} as const;

/** Sleeping hours in minutes after local midnight. The pet does not get hungry while asleep. */
export type SleepHours = { startMinute: number; endMinute: number };

export type Settings = { sleep: SleepHours };

export const DEFAULT_SETTINGS: Settings = {
  sleep: { startMinute: 23 * 60, endMinute: 8 * 60 },
};
