// The pet engine: the previous state plus one usage snapshot gives the next state.
// Pure and free of browser APIs. The clock is the snapshot's own read time.

import type { UsageReading, UsageSnapshot, UsageWindow } from "../usage/snapshot";
import { awakeMs } from "./awake";
import { RULES, type Settings, WEEK_MS } from "./config";
import { grow } from "./growth";
import type { PetState } from "./state";

export type PetEvent =
  | { type: "ate"; at: string; points: number }
  | { type: "hatched"; at: string }
  | { type: "birthday"; at: string; age: number }
  | { type: "ran-away"; at: string }
  | { type: "came-back"; at: string };

export type StepResult = { state: PetState; events: PetEvent[] };

/** How far the session's percent rose since the previous read. A drop means it was reset. */
function rise(previous: UsageWindow, current: UsageWindow, wasReset: boolean): number {
  if (wasReset || current.percent < previous.percent) return current.percent;
  return current.percent - previous.percent;
}

/**
 * How far the weekly percent rose since the previous read, which is the XP earned. A drop is a
 * new week only when the week has ended or Claude reports a later reset time, as after an early
 * reset of everyone's limits. Any other drop is a correction, and a correction earns nothing:
 * XP is kept for good, so counting it as fresh usage would hand out XP that was never earned.
 */
function weekRise(previous: UsageWindow, current: UsageWindow, weekEnded: boolean): number {
  if (weekEnded) return current.percent;
  if (current.percent >= previous.percent) return current.percent - previous.percent;
  const resetMovedLater =
    previous.resetsAt !== null &&
    current.resetsAt !== null &&
    Date.parse(current.resetsAt) > Date.parse(previous.resetsAt);
  return resetMovedLater ? current.percent : 0;
}

/** True when the window the previous read saw has ended and the new read shows a different one. */
function sessionWasReset(previous: UsageWindow, current: UsageWindow, now: number): boolean {
  if (previous.resetsAt === null || previous.resetsAt === current.resetsAt) return false;
  return now >= Date.parse(previous.resetsAt);
}

/**
 * True once the week has ended and the read confirms it. Right at the reset, Claude can still
 * report the old week for a moment; rolling over then would count the old percent as new food.
 */
function weekHasEnded(state: PetState, reading: UsageReading, now: number): boolean {
  if (state.weekEndsAt === null || now < Date.parse(state.weekEndsAt)) return false;
  const reported = reading.long.resetsAt;
  return reported === null || Date.parse(reported) > now;
}

function endsWithEmptyWeeks(weeks: number[]): boolean {
  const recent = weeks.slice(-RULES.emptyWeeksToRunAway);
  return (
    recent.length === RULES.emptyWeeksToRunAway &&
    recent.every((peak) => peak < RULES.emptyWeekBelowPercent)
  );
}

export function step(previous: PetState, snapshot: UsageSnapshot, settings: Settings): StepResult {
  // While the pet can't see, nothing moves. Time for hunger and neglect is paused.
  if (!snapshot.ok) {
    const state: PetState = { ...previous, blind: snapshot.reason };
    // The pause starts at the first failed read. The waking time before it still counts:
    // a laptop that wakes up before its network does must not erase the hours it was shut.
    if (!previous.blind && previous.reading) {
      const from = Date.parse(previous.reading.readAt);
      state.hungerMs += awakeMs(from, Date.parse(snapshot.readAt), settings.sleep);
    }
    return { state, events: [] };
  }

  const at = snapshot.readAt;
  const now = Date.parse(at);
  const before = previous.reading;
  const state: PetState = { ...previous, reading: snapshot, blind: null };
  const events: PetEvent[] = [];

  // Hunger counts the waking time between reads, except across an outage.
  if (before && !previous.blind) {
    state.hungerMs += awakeMs(Date.parse(before.readAt), now, settings.sleep);
  }

  // The weekly reset closes the week for the care rules. It is not a birthday: ages are
  // bought with XP, below.
  const weekEnded = weekHasEnded(state, snapshot, now);
  if (weekEnded && state.weekEndsAt !== null) {
    const ended = Date.parse(state.weekEndsAt);
    // More than one week can pass between reads, for example while the browser is closed.
    const weeksPassed = 1 + Math.floor((now - ended) / WEEK_MS);
    if (state.hatchedAt !== null) {
      // Only the week the pet watched goes into its history. Weeks it never saw are not
      // held against it, because usage from other devices may have happened unseen.
      state.weeks = [...state.weeks, state.weekPeak].slice(-RULES.conditionWeeks);
      // Babies don't run away. In the design that is for children and older.
      if (!state.ranAway && state.age >= RULES.childAge && endsWithEmptyWeeks(state.weeks)) {
        state.ranAway = true;
        events.push({ type: "ran-away", at });
      }
    }
    state.weekPeak = 0;
    state.weekEndsAt = new Date(ended + weeksPassed * WEEK_MS).toISOString();
  }
  // Trust the reset time in the read over local arithmetic.
  const reportedEnd = snapshot.long.resetsAt;
  if (reportedEnd !== null && Date.parse(reportedEnd) > now) state.weekEndsAt = reportedEnd;
  state.weekPeak = Math.max(state.weekPeak, snapshot.long.percent);

  // Food. The first read only sets the baseline: usage from before install is not a meal.
  if (before) {
    const sessionRise = rise(
      before.short,
      snapshot.short,
      sessionWasReset(before.short, snapshot.short, now),
    );
    const weekly = weekRise(before.long, snapshot.long, weekEnded);

    if (sessionRise > 0 || weekly > 0) {
      state.lastMealAt = at;
      state.hungerMs = 0;
      state.lastBite = { at, points: sessionRise };
      events.push({ type: "ate", at, points: sessionRise });

      if (state.ranAway) {
        state.ranAway = false;
        events.push({ type: "came-back", at });
      }

      if (state.hatchedAt === null) {
        state.warmth = Math.min(RULES.hatchWarmth, state.warmth + sessionRise);
        if (state.warmth >= RULES.hatchWarmth) {
          state.hatchedAt = at;
          events.push({ type: "hatched", at });
        }
      } else {
        // XP starts once the egg has hatched. The meal that hatches it only warms it.
        state.xp += weekly;
      }
    }
  }

  // Growing up. Runs on every read, so XP a pet brought from an older version counts too.
  if (state.hatchedAt !== null) {
    const grown = grow(state.age, state.xp);
    if (grown.age > state.age) {
      state.lastBirthday = { at, age: grown.age, fromAge: state.age };
      state.age = grown.age;
      state.xp = grown.xp;
      events.push({ type: "birthday", at, age: state.age });
    }
  }

  return { state, events };
}

/** Names or renames the pet. Does nothing before hatching or for a blank name. */
export function namePet(state: PetState, name: string): PetState {
  const cleaned = name.trim().replace(/\s+/g, " ").slice(0, RULES.maxNameLength).trim();
  if (state.hatchedAt === null || cleaned === "") return state;
  return { ...state, name: cleaned };
}
