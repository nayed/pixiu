import { describe, expect, it } from "vitest";
import { use } from "../sim/fake-claude";
import {
  createSimulation,
  feed,
  poll,
  type Simulation,
  setFailure,
  sleep,
  wait,
} from "../sim/simulation";
import type { UsageReading } from "../usage/snapshot";
import { DEFAULT_SETTINGS as S, WEEK_MS } from "./config";
import { namePet, step } from "./engine";
import { newPet } from "./state";
import { hungerMs, isUnderfed, viewPet } from "./view";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// A Monday at noon. The week resets on Thursday at 04:00, as on the test account.
const START = new Date("2026-11-16T12:00:00Z");
const WEEK_RESET = new Date("2026-11-19T04:00:00Z");
const TO_FIRST_RESET = WEEK_RESET.getTime() - START.getTime();

/** A new install that has made its first read. */
const install = () => poll(createSimulation(START, WEEK_RESET), S);
/** A pet that hatched by eating 22% of a session in one step. */
const hatched = () => feed(install(), 22, S);

const view = (sim: Simulation) => viewPet(sim.pet, new Date(sim.fake.now), S);
const types = (sim: Simulation) => sim.events.map((event) => event.type);
const count = (sim: Simulation, type: string) => types(sim).filter((t) => t === type).length;

describe("the egg", () => {
  it("starts as an egg with no cracks", () => {
    expect(view(install())).toEqual({ kind: "egg", crack: "none", warmth: 0, unreachable: null });
  });

  it("does not count usage from before install", () => {
    const sim = createSimulation(START, WEEK_RESET);
    const first = poll({ ...sim, fake: use(sim.fake, 57) }, S);
    expect(first.events).toEqual([]);
    expect(first.pet.warmth).toBe(0);
    expect(first.pet.weekPeak).toBe(10);
  });

  it("hatches straight from no cracks when a meal arrives in one jump", () => {
    const sim = hatched();
    expect(sim.events).toEqual([
      { type: "ate", at: START.toISOString(), points: 22 },
      { type: "hatched", at: START.toISOString() },
    ]);
    expect(view(sim)).toMatchObject({ kind: "pet", stage: "baby", age: 0, name: null });
  });

  it("warms over small meals, cracks, and never cools", () => {
    let sim = feed(install(), 3, S);
    expect(view(sim)).toMatchObject({ kind: "egg", crack: "none", warmth: 3 });
    sim = feed(sim, 2, S);
    expect(view(sim)).toMatchObject({ crack: "small", warmth: 5 });

    sim = wait(sim, 30 * HOUR, S); // The session resets; the egg waits.
    expect(view(sim)).toMatchObject({ crack: "small", warmth: 5 });

    sim = feed(sim, 4, S);
    expect(view(sim)).toMatchObject({ kind: "egg", crack: "full", warmth: 9 });
    sim = feed(sim, 1, S);
    expect(view(sim).kind).toBe("pet");
  });

  it("shows the reason when the first read fails", () => {
    const sim = setFailure(createSimulation(START, WEEK_RESET), "not-set-up", S);
    expect(view(sim)).toMatchObject({ kind: "egg", unreachable: "not-set-up" });
  });
});

describe("feeding", () => {
  it("eats for a few minutes after the percent rises", () => {
    let sim = hatched();
    expect(view(sim)).toMatchObject({ mood: "eating" });
    sim = wait(sim, 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "happy" });
  });

  it("does not take a session reset for a meal", () => {
    let sim = feed(install(), 57, S);
    sim = wait(sim, 6 * HOUR, S);
    expect(sim.pet.reading?.short).toEqual({ percent: 0, resetsAt: null });
    expect(count(sim, "ate")).toBe(1);

    sim = feed(sim, 3, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "ate", points: 3 });
  });

  it("counts the whole new session when a reset happened unseen", () => {
    let sim = feed(install(), 57, S);
    sim = sleep(sim, 6 * HOUR); // Browser closed across the reset.
    sim = feed(sim, 60, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "ate", points: 60 });
  });

  it("is stuffed at the session limit until the session resets", () => {
    let sim = feed(hatched(), 78, S);
    sim = wait(sim, 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "stuffed" });
    sim = wait(sim, 5 * HOUR, S);
    expect(view(sim)).toMatchObject({ mood: "happy" });
  });

  it("stops being stuffed at the reset time even before the next read", () => {
    const sim = wait(feed(hatched(), 78, S), 10 * MINUTE, S);
    const afterReset = new Date(sim.fake.now + 5 * HOUR);
    expect(viewPet(sim.pet, afterReset, S)).toMatchObject({ mood: "happy" });
  });
});

describe("hunger", () => {
  it("sets in after six waking hours without a meal", () => {
    let sim = wait(hatched(), 5 * HOUR + 55 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "happy" });
    sim = wait(sim, 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "hungry" });

    sim = wait(feed(sim, 1, S), 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "happy" });
  });

  it("does not grow overnight", () => {
    let sim = wait(hatched(), 8 * HOUR, S);
    sim = feed(sim, 5, S); // 20:00
    sim = wait(sim, 12 * HOUR, S); // 08:00: three waking hours since the meal.
    expect(view(sim)).toMatchObject({ mood: "happy" });
    sim = wait(sim, 3 * HOUR, S); // 11:00
    expect(view(sim)).toMatchObject({ mood: "hungry" });
  });

  it("counts time the browser was closed when nothing was eaten", () => {
    const sim = poll(sleep(hatched(), 7 * HOUR), S);
    expect(view(sim)).toMatchObject({ mood: "hungry" });
  });

  it("is paused while Claude can't be reached", () => {
    let sim = wait(hatched(), 1 * HOUR, S);
    sim = wait(setFailure(sim, "offline", S), 8 * HOUR, S);
    expect(view(sim)).toMatchObject({ kind: "pet", mood: "happy", unreachable: "offline" });

    sim = setFailure(sim, null, S);
    expect(view(sim)).toMatchObject({ mood: "happy", unreachable: null });
    sim = wait(sim, 1 * HOUR, S);
    expect(hungerMs(sim.pet, new Date(sim.fake.now), S)).toBe(2 * HOUR);
  });

  it("counts the time before an outage when the first read after a long sleep fails", () => {
    // The laptop was shut for seven waking hours and wakes up before its network does.
    let sim = setFailure(sleep(hatched(), 7 * HOUR), "offline", S);
    expect(view(sim)).toMatchObject({ mood: "hungry", unreachable: "offline" });
    sim = wait(sim, 1 * HOUR, S);
    sim = setFailure(sim, null, S);
    expect(hungerMs(sim.pet, new Date(sim.fake.now), S)).toBe(7 * HOUR);
  });

  it("does not keep eating when the clock is set back", () => {
    const sim = hatched();
    const anHourEarlier = new Date(sim.fake.now - HOUR);
    expect(viewPet(sim.pet, anHourEarlier, S)).toMatchObject({ mood: "happy" });
  });

  it("counts no hunger for a read dated before the previous one", () => {
    const sim = wait(hatched(), 1 * HOUR, S);
    const earlier = { ...sim.pet.reading, readAt: new Date(sim.fake.now - 3 * HOUR).toISOString() };
    const { state, events } = step(sim.pet, earlier as UsageReading, S);
    expect(state.hungerMs).toBe(sim.pet.hungerMs);
    expect(events).toEqual([]);
  });
});

describe("age and stages", () => {
  it("has a birthday at the weekly reset and stops being a baby", () => {
    const sim = wait(hatched(), TO_FIRST_RESET + 5 * MINUTE, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "birthday", age: 1 });
    expect(sim.pet.weeks).toEqual([4]);
    expect(view(sim)).toMatchObject({ kind: "pet", stage: "child", age: 1 });
  });

  it("does not age inside the egg", () => {
    const sim = wait(install(), TO_FIRST_RESET + WEEK_MS, S);
    expect(sim.events).toEqual([]);
    expect(sim.pet.age).toBe(0);
  });

  it("grows into a teen at 7 and an adult at 12", () => {
    let sim = wait(hatched(), TO_FIRST_RESET + HOUR, S);
    const stages: Record<number, string> = {};
    for (let week = 1; week <= 12; week++) {
      const now = view(sim);
      if (now.kind === "pet") stages[now.age] = now.stage;
      sim = wait(feed(sim, 50, S), WEEK_MS, S);
    }
    expect(stages[6]).toBe("child");
    expect(stages[7]).toBe("teen");
    expect(stages[11]).toBe("teen");
    expect(stages[12]).toBe("adult");
  });

  it("ages by every week that passed while the browser was closed", () => {
    const sim = poll(sleep(hatched(), TO_FIRST_RESET + 2 * WEEK_MS + HOUR), S);
    expect(sim.events.at(-1)).toMatchObject({ type: "birthday", age: 3 });
    // Only the week the pet watched is in its history, so it did not run away.
    expect(sim.pet.weeks).toEqual([4]);
    expect(view(sim).kind).toBe("pet");
  });

  it("waits for the read to confirm the reset before it has a birthday", () => {
    const reading = (readAt: string, percent: number, resetsAt: string): UsageReading => ({
      ok: true,
      readAt,
      short: { percent: 0, resetsAt: null },
      long: { percent, resetsAt },
    });
    const born = { ...newPet(START), hatchedAt: START.toISOString() };
    const before = step(born, reading("2026-11-19T03:55:00Z", 35, "2026-11-19T04:00:00Z"), S);

    // Just past the reset, Claude still reports the old week.
    const stale = step(
      before.state,
      reading("2026-11-19T04:00:01Z", 35, "2026-11-19T04:00:00Z"),
      S,
    );
    expect(stale.events).toEqual([]);

    const fresh = step(stale.state, reading("2026-11-19T04:05:00Z", 0, "2026-11-26T04:00:00Z"), S);
    expect(fresh.events).toEqual([{ type: "birthday", at: "2026-11-19T04:05:00Z", age: 1 }]);
    expect(fresh.state.weeks).toEqual([35]);
    expect(fresh.state.weekPeak).toBe(0);
  });
});

describe("neglect", () => {
  it("runs away after two empty weeks and comes back at the next meal", () => {
    let sim = { ...hatched(), pet: namePet(hatched().pet, "Mochi") };
    sim = wait(sim, TO_FIRST_RESET + WEEK_MS + HOUR, S);
    expect(sim.pet.weeks).toEqual([4, 0]);
    expect(types(sim).slice(-2)).toEqual(["birthday", "ran-away"]);
    expect(view(sim)).toMatchObject({ kind: "ran-away", age: 2, name: "Mochi" });

    sim = wait(sim, WEEK_MS, S);
    expect(count(sim, "ran-away")).toBe(1);
    expect(view(sim)).toMatchObject({ kind: "ran-away", age: 3 });

    sim = feed(sim, 10, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "came-back" });
    // Back with its age and name intact, a little worse for wear.
    sim = wait(sim, 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ kind: "pet", age: 3, name: "Mochi", mood: "sulky" });
  });

  it("does not run away from a week that was thin but not empty", () => {
    let sim = wait(hatched(), TO_FIRST_RESET + HOUR, S);
    sim = wait(feed(sim, 40, S), WEEK_MS, S);
    expect(sim.pet.weeks).toEqual([4, 7]);
    expect(view(sim).kind).toBe("pet");
  });

  it("sulks after two thin weeks and recovers when fed well", () => {
    let sim = wait(feed(hatched(), 18, S), TO_FIRST_RESET + HOUR, S);
    expect(sim.pet.weeks).toEqual([7]);
    expect(isUnderfed(sim.pet)).toBe(false); // One week of history is not enough.

    sim = wait(feed(sim, 40, S), WEEK_MS, S);
    expect(sim.pet.weeks).toEqual([7, 7]);
    sim = wait(feed(sim, 1, S), 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ mood: "sulky" });

    // Four full sessions lift the current week enough to count right away.
    for (let session = 0; session < 4; session++) sim = wait(feed(sim, 100, S), 5 * HOUR, S);
    expect(sim.pet.weekPeak).toBeGreaterThan(61);
    expect(isUnderfed(sim.pet)).toBe(false);
  });
});

describe("namePet", () => {
  it("does nothing before hatching", () => {
    expect(namePet(install().pet, "Mochi").name).toBeNull();
  });

  it("trims the name and caps its length", () => {
    const pet = hatched().pet;
    expect(namePet(pet, "  Mochi  ").name).toBe("Mochi");
    expect(namePet(pet, "A very long pet name").name).toBe("A very long");
  });

  it("keeps the old name when the new one is blank", () => {
    const pet = namePet(hatched().pet, "Mochi");
    expect(namePet(pet, "   ").name).toBe("Mochi");
  });
});
