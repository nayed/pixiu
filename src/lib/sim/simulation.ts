// Runs the pet engine against the fake Claude with a fake clock. Used by the engine tests and
// by the debug page, so states that take weeks to reach can be seen in seconds.

import type { Settings } from "../pet/config";
import { type PetEvent, step } from "../pet/engine";
import { newPet, type PetState } from "../pet/state";
import { advance, createFakeClaude, type FakeClaude, read, use, useWeek } from "./fake-claude";

export const POLL_MS = 5 * 60_000;

export type Simulation = {
  fake: FakeClaude;
  pet: PetState;
  /** Every event so far, oldest first. */
  events: PetEvent[];
};

export function createSimulation(now: Date, weekResetsAt: Date): Simulation {
  return { fake: createFakeClaude(now, weekResetsAt), pet: newPet(now), events: [] };
}

/** One poll: read the fake usage and run the engine on it. */
export function poll(sim: Simulation, settings: Settings): Simulation {
  const { state, events } = step(sim.pet, read(sim.fake), settings);
  return { fake: sim.fake, pet: state, events: [...sim.events, ...events] };
}

/** Lets time pass, polling on the usual schedule along the way. */
export function wait(sim: Simulation, ms: number, settings: Settings): Simulation {
  let current = sim;
  let left = ms;
  while (left > 0) {
    const chunk = Math.min(left, POLL_MS);
    current = poll({ ...current, fake: advance(current.fake, chunk) }, settings);
    left -= chunk;
  }
  return current;
}

/** Lets time pass with no polls at all, as when the browser is closed. */
export function sleep(sim: Simulation, ms: number): Simulation {
  return { ...sim, fake: advance(sim.fake, ms) };
}

/** Uses Claude, then polls. */
export function feed(sim: Simulation, sessionPoints: number, settings: Settings): Simulation {
  return poll({ ...sim, fake: use(sim.fake, sessionPoints) }, settings);
}

/** Adds weekly points without touching the session, then polls. A quick way to earn XP. */
export function feedWeek(sim: Simulation, weekPoints: number, settings: Settings): Simulation {
  return poll({ ...sim, fake: useWeek(sim.fake, weekPoints) }, settings);
}

/** Starts or ends an outage, then polls. */
export function setFailure(
  sim: Simulation,
  failure: FakeClaude["failure"],
  settings: Settings,
): Simulation {
  return poll({ ...sim, fake: { ...sim.fake, failure } }, settings);
}
