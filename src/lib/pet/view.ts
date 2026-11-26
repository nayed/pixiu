// What the pet looks like right now. Every surface renders from this, so the popup and the
// toolbar icon can never disagree. Derived from the state and the clock; nothing is stored.

import type { UsageFailureReason, UsageWindow } from "../usage/snapshot";
import { awakeMs } from "./awake";
import { RULES, type Settings } from "./config";
import type { PetState } from "./state";

export type Stage = "baby" | "child" | "teen" | "adult";
export type Mood = "happy" | "eating" | "hungry" | "stuffed" | "sulky";
export type EggCrack = "none" | "small" | "full";

/** A birthday the pet is celebrating: the age it reached, and the stage it grew into, if new. */
export type Celebration = { age: number; newStage: Stage | null };

export type PetView = (
  | { kind: "egg"; crack: EggCrack; warmth: number }
  | {
      kind: "pet";
      stage: Stage;
      mood: Mood;
      age: number;
      name: string | null;
      celebrating: Celebration | null;
    }
  | { kind: "ran-away"; stage: Stage; age: number; name: string | null }
) & {
  /** Set while usage can't be read. The surfaces show the gray "can't reach Claude" pet. */
  unreachable: UsageFailureReason | null;
};

export function stageFor(age: number): Stage {
  if (age >= RULES.adultAge) return "adult";
  if (age >= RULES.teenAge) return "teen";
  if (age >= RULES.childAge) return "child";
  return "baby";
}

function crackFor(warmth: number): EggCrack {
  if (warmth >= RULES.fullCrackWarmth) return "full";
  if (warmth >= RULES.firstCrackWarmth) return "small";
  return "none";
}

/** A usage window as it stands now: once its reset time has passed, it is empty. */
export function currentWindow(window: UsageWindow | undefined, now: Date): UsageWindow {
  if (!window) return { percent: 0, resetsAt: null };
  if (window.resetsAt && now.getTime() >= Date.parse(window.resetsAt)) {
    return { percent: 0, resetsAt: null };
  }
  return window;
}

/** Waking time since the last meal. Stands still while the pet can't see usage. */
export function hungerMs(state: PetState, now: Date, settings: Settings): number {
  if (state.blind || !state.reading) return state.hungerMs;
  const since = awakeMs(Date.parse(state.reading.readAt), now.getTime(), settings.sleep);
  return state.hungerMs + since;
}

/**
 * True when recent weeks were thin. A good current week counts right away, so feeding the pet
 * helps before the week is over; a current week that has barely started is left out.
 */
export function isUnderfed(state: PetState): boolean {
  if (state.weeks.length < RULES.sulkyMinWeeks) return false;
  const average = (peaks: number[]) => peaks.reduce((sum, peak) => sum + peak, 0) / peaks.length;
  const completed = state.weeks.slice(-RULES.conditionWeeks);
  const withCurrent = [...state.weeks, state.weekPeak].slice(-RULES.conditionWeeks);
  return Math.max(average(completed), average(withCurrent)) < RULES.sulkyBelowPercent;
}

/** How many of the most recent completed weeks were thin, for "underfed for 2 weeks". */
export function thinWeeks(state: PetState): number {
  let count = 0;
  for (const peak of [...state.weeks].reverse()) {
    if (peak >= RULES.sulkyBelowPercent) break;
    count++;
  }
  return count;
}

function moodFor(state: PetState, stage: Stage, now: Date, settings: Settings): Mood {
  const time = now.getTime();

  // A bite dated in the future means the clock was set back; it is not being eaten now.
  const sinceBite = state.lastBite ? time - Date.parse(state.lastBite.at) : -1;
  if (sinceBite >= 0 && sinceBite < RULES.eatingMs) return "eating";

  if (currentWindow(state.reading?.short, now).percent >= 100) return "stuffed";

  if (hungerMs(state, now, settings) >= RULES.hungryAfterMs) return "hungry";
  // The baby stage lasts one week, too short to sulk.
  if (stage !== "baby" && isUnderfed(state)) return "sulky";
  return "happy";
}

/**
 * The birthday the pet is celebrating right now, if any. The party lasts a day, waits for the
 * pet to have a name, and pauses while it can't see.
 */
export function celebrationOf(state: PetState, now: Date): Celebration | null {
  const birthday = state.lastBirthday;
  if (!birthday || state.name === null || state.blind) return null;
  const since = now.getTime() - Date.parse(birthday.at);
  // A birthday dated in the future means the clock was set back: nothing to celebrate yet.
  if (since < 0 || since >= RULES.celebrationMs) return null;
  const stage = stageFor(birthday.age);
  return { age: birthday.age, newStage: stage === stageFor(birthday.fromAge) ? null : stage };
}

export function viewPet(state: PetState, now: Date, settings: Settings): PetView {
  const unreachable = state.blind;
  if (state.hatchedAt === null) {
    return { kind: "egg", crack: crackFor(state.warmth), warmth: state.warmth, unreachable };
  }
  const { age, name } = state;
  const stage = stageFor(age);
  if (state.ranAway) return { kind: "ran-away", stage, age, name, unreachable };
  const mood = moodFor(state, stage, now, settings);
  const celebrating = celebrationOf(state, now);
  return { kind: "pet", stage, mood, age, name, unreachable, celebrating };
}
