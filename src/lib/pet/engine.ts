// The pet engine: the previous state plus one usage snapshot gives the next state.
// Pure and free of browser APIs. The clock is the snapshot's own read time.

import type { UsageReading, UsageSnapshot, UsageWindow } from "../usage/snapshot";
import { awakeMs } from "./awake";
import { RULES, type Settings, WEEK_MS } from "./config";
import type { PetState } from "./state";

export type PetEvent =
  | { type: "ate"; at: string; points: number }
  | { type: "hatched"; at: string }
  | { type: "birthday"; at: string; age: number }
  | { type: "ran-away"; at: string }
  | { type: "came-back"; at: string };

export type StepResult = { state: PetState; events: PetEvent[] };

/** How far a window's percent rose since the previous read. A drop means it was reset. */
function rise(previous: UsageWindow, current: UsageWindow, wasReset: boolean): number {
  if (wasReset || current.percent < previous.percent) return current.percent;
  return current.percent - previous.percent;
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

  // The weekly reset is a birthday.
  const weekEnded = weekHasEnded(state, snapshot, now);
  if (weekEnded && state.weekEndsAt !== null) {
    const ended = Date.parse(state.weekEndsAt);
    // More than one week can pass between reads, for example while the browser is closed.
    const weeksPassed = 1 + Math.floor((now - ended) / WEEK_MS);
    if (state.hatchedAt !== null) {
      state.age += weeksPassed;
      events.push({ type: "birthday", at, age: state.age });
      // Only the week the pet watched goes into its history. Weeks it never saw are not
      // held against it, because usage from other devices may have happened unseen.
      state.weeks = [...state.weeks, state.weekPeak].slice(-RULES.conditionWeeks);
      if (!state.ranAway && endsWithEmptyWeeks(state.weeks)) {
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
    const weekRise = rise(before.long, snapshot.long, weekEnded);

    if (sessionRise > 0 || weekRise > 0) {
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
      }
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
