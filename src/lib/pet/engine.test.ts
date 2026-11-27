import { describe, expect, it } from "vitest";
import { use } from "../sim/fake-claude";
import {
  createSimulation,
  feed,
  feedWeek,
  poll,
  type Simulation,
  setFailure,
  sleep,
  wait,
} from "../sim/simulation";
import type { UsageReading } from "../usage/snapshot";
import { DEFAULT_SETTINGS as S, WEEK_MS } from "./config";
import { namePet, step } from "./engine";
import { newPet, upgradePet } from "./state";
import { celebrationOf, hungerMs, isUnderfed, viewPet } from "./view";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// A Monday at noon. The week resets on Thursday at 04:00, as on the test account.
const START = new Date("2026-11-16T12:00:00Z");
const WEEK_RESET = new Date("2026-11-19T04:00:00Z");
const TO_FIRST_RESET = WEEK_RESET.getTime() - START.getTime();

/** A new install that has made its first read. */
const install = () => poll(createSimulation(START, WEEK_RESET), S);
/** A pet that hatched by eating 30% of a session in one step. Its week is at 5%. */
const hatched = () => feed(install(), 30, S);
/** A child: hatched, then fed 50 points of the week, the 50 XP that age 1 costs. */
const child = () => feedWeek(hatched(), 50, S);
const named = (sim: Simulation): Simulation => ({ ...sim, pet: namePet(sim.pet, "Mochi") });

/** A successful read with no session running. */
const reading = (readAt: string, weekPercent: number, weekResetsAt: string): UsageReading => ({
  ok: true,
  readAt,
  short: { percent: 0, resetsAt: null },
  long: { percent: weekPercent, resetsAt: weekResetsAt },
});
/** A pet that hatched at the start, before any read. */
const newlyHatched = () => ({ ...newPet(START), hatchedAt: START.toISOString() });

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
    expect(first.pet.xp).toBe(0);
    expect(first.pet.weekPeak).toBe(10);
  });

  it("hatches straight from no cracks when a meal arrives in one jump", () => {
    const sim = hatched();
    expect(sim.events).toEqual([
      { type: "ate", at: START.toISOString(), points: 30 },
      { type: "hatched", at: START.toISOString() },
    ]);
    expect(view(sim)).toMatchObject({ kind: "pet", stage: "baby", age: 0, name: null });
  });

  it("warms over small meals, cracks, and never cools", () => {
    let sim = feed(install(), 3, S);
    expect(view(sim)).toMatchObject({ kind: "egg", crack: "none", warmth: 3 });
    sim = feed(sim, 9, S);
    expect(view(sim)).toMatchObject({ crack: "small", warmth: 12 });

    sim = wait(sim, 30 * HOUR, S); // The session resets; the egg waits.
    expect(view(sim)).toMatchObject({ crack: "small", warmth: 12 });

    sim = feed(sim, 15, S);
    expect(view(sim)).toMatchObject({ kind: "egg", crack: "full", warmth: 27 });
    sim = feed(sim, 3, S);
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

describe("XP and age", () => {
  it("hatches with no XP: the meal that hatches the egg only warms it", () => {
    expect(hatched().pet).toMatchObject({ age: 0, xp: 0 });
  });

  it("does not earn XP inside the egg", () => {
    const sim = feed(install(), 5, S);
    expect(sim.pet.reading?.long.percent).toBe(1);
    expect(sim.pet).toMatchObject({ hatchedAt: null, xp: 0 });
  });

  it("earns 1 XP for each point the weekly percent rises", () => {
    // Half a session is 9 points of the week in the pretend Claude.
    const sim = feed(hatched(), 50, S);
    expect(sim.pet.xp).toBe(9);
  });

  it("has a birthday when its XP pays for the next age, and keeps what is left over", () => {
    let sim = feedWeek(hatched(), 49, S);
    expect(sim.pet).toMatchObject({ age: 0, xp: 49 });

    sim = feedWeek(sim, 15, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "birthday", age: 1 });
    expect(sim.pet).toMatchObject({ age: 1, xp: 14 });
    expect(view(sim)).toMatchObject({ kind: "pet", stage: "child", age: 1 });
  });

  it("can cross more than one age in one read, with one birthday for the age it reaches", () => {
    const before = hatched();
    const sim = feedWeek({ ...before, pet: { ...before.pet, xp: 100 } }, 10, S);
    expect(sim.pet).toMatchObject({ age: 2, xp: 0 });
    expect(count(sim, "birthday")).toBe(1);
    expect(sim.events.at(-1)).toMatchObject({ type: "birthday", age: 2 });
  });

  it("keeps its XP across the weekly reset, which is no longer a birthday", () => {
    let sim = feedWeek(hatched(), 30, S);
    sim = wait(sim, TO_FIRST_RESET + HOUR, S);
    expect(count(sim, "birthday")).toBe(0);
    expect(sim.pet).toMatchObject({ age: 0, xp: 30, weeks: [35], weekPeak: 0 });

    // The new week starts from 0%, and every point of it counts.
    sim = feedWeek(sim, 20, S);
    expect(sim.pet).toMatchObject({ age: 1, xp: 0 });
  });

  it("grows into a teen at 560 XP and an adult at 1,260", () => {
    const seen: string[] = [];
    let sim = hatched();
    for (let week = 1; week <= 13; week++) {
      // The whole week: 95 XP the first week, which started at 5%, then 100 a week.
      sim = feedWeek(sim, 100, S);
      const now = view(sim);
      seen.push(now.kind === "pet" ? `${now.age} ${now.stage}` : now.kind);
      sim = wait(sim, WEEK_MS, S);
    }
    expect(seen[4]).toBe("6 child"); // 495 XP
    expect(seen[5]).toBe("7 teen"); // 595 XP
    expect(seen[11]).toBe("11 teen"); // 1,195 XP
    expect(seen[12]).toBe("12 adult"); // 1,295 XP
  });

  it("earns nothing for weeks it never saw, and does not age through them", () => {
    let sim = feedWeek(hatched(), 20, S);
    sim = poll(sleep(sim, TO_FIRST_RESET + 2 * WEEK_MS + HOUR), S);
    expect(sim.pet).toMatchObject({ age: 0, xp: 20 });
    // Only the week the pet watched is in its history, so it did not run away.
    expect(sim.pet.weeks).toEqual([25]);
    expect(view(sim).kind).toBe("pet");
  });

  it("earns nothing when Claude corrects the weekly percent down", () => {
    const resets = "2026-11-19T04:00:00Z";
    let result = step(newlyHatched(), reading("2026-11-17T10:00:00Z", 40, resets), S);
    result = step(result.state, reading("2026-11-17T10:05:00Z", 30, resets), S);
    expect(result.state.xp).toBe(0);
    expect(result.events).toEqual([]);

    result = step(result.state, reading("2026-11-17T10:10:00Z", 33, resets), S);
    expect(result.state.xp).toBe(3);
  });

  it("counts usage after an early reset that moves the weekly reset time", () => {
    let result = step(
      newlyHatched(),
      reading("2026-11-17T10:00:00Z", 40, "2026-11-19T04:00:00Z"),
      S,
    );
    result = step(result.state, reading("2026-11-17T10:05:00Z", 2, "2026-11-24T10:05:00Z"), S);
    expect(result.state.xp).toBe(2);
  });

  it("waits for the read to confirm the reset before it closes the week", () => {
    const before = step(
      newlyHatched(),
      reading("2026-11-19T03:55:00Z", 35, "2026-11-19T04:00:00Z"),
      S,
    );

    // Just past the reset, Claude still reports the old week.
    const stale = step(
      before.state,
      reading("2026-11-19T04:00:01Z", 35, "2026-11-19T04:00:00Z"),
      S,
    );
    expect(stale.events).toEqual([]);
    expect(stale.state.weeks).toEqual([]);

    const fresh = step(stale.state, reading("2026-11-19T04:05:00Z", 0, "2026-11-26T04:00:00Z"), S);
    expect(fresh.events).toEqual([]);
    expect(fresh.state.weeks).toEqual([35]);
    expect(fresh.state).toMatchObject({ weekPeak: 0, xp: 0, age: 0 });
  });
});

describe("a pet from 0.1.0", () => {
  it("keeps its age, gets this week's usage as XP, and has a birthday at its next read", () => {
    // A child at 65% of its week, close to Crixus when the XP rules arrived.
    const sim = feedWeek(child(), 10, S);
    const { xp: _xp, lastBirthday: _birthday, ...rest } = sim.pet;
    const upgraded = upgradePet({ ...rest, version: 1 });
    expect(upgraded).toMatchObject({ version: 3, age: 1, xp: 65, lastBirthday: null });

    // Age 2 costs 60 XP, so the first read after the update pays for it.
    const next = poll({ ...sim, pet: upgraded }, S);
    expect(next.events.at(-1)).toMatchObject({ type: "birthday", age: 2 });
    expect(next.pet).toMatchObject({ age: 2, xp: 5 });
  });

  it("gives an egg no XP", () => {
    const { xp: _xp, lastBirthday: _birthday, ...rest } = feed(install(), 5, S).pet;
    expect(upgradePet({ ...rest, version: 1 }).xp).toBe(0);
  });

  it("leaves a pet that is already up to date alone", () => {
    const pet = child().pet;
    expect(upgradePet(pet)).toBe(pet);
  });
});

describe("a pet from 0.2.0", () => {
  it("has no birthday on record, so nothing celebrates after the update", () => {
    const sim = named(child());
    const { lastBirthday: _birthday, ...rest } = sim.pet;
    const upgraded = upgradePet({ ...rest, version: 2 });
    expect(upgraded).toEqual({ ...sim.pet, version: 3, lastBirthday: null });
    expect(viewPet(upgraded, new Date(sim.fake.now), S)).toMatchObject({ celebrating: null });
  });
});

describe("birthdays", () => {
  const later = (sim: Simulation, ms: number) => new Date(sim.fake.now + ms);

  it("remembers its last birthday: when, the age it reached, and the age before", () => {
    expect(child().pet.lastBirthday).toEqual({ at: START.toISOString(), age: 1, fromAge: 0 });
  });

  it("celebrates for a day", () => {
    const sim = named(child());
    expect(view(sim)).toMatchObject({ celebrating: { age: 1, newStage: "child" } });
    expect(viewPet(sim.pet, later(sim, 23 * HOUR), S)).toMatchObject({ celebrating: { age: 1 } });
    expect(viewPet(sim.pet, later(sim, 24 * HOUR), S)).toMatchObject({ celebrating: null });
  });

  it("waits for a name before it celebrates", () => {
    expect(view(child())).toMatchObject({ kind: "pet", name: null, celebrating: null });
  });

  it("names the new stage only when a birthday crosses into one", () => {
    const pet = named(child()).pet;
    const party = (age: number, fromAge: number) =>
      celebrationOf(
        { ...pet, age, lastBirthday: { at: START.toISOString(), age, fromAge } },
        new Date(START.getTime() + HOUR),
      );
    expect(party(3, 2)).toEqual({ age: 3, newStage: null });
    expect(party(7, 6)).toEqual({ age: 7, newStage: "teen" });
    expect(party(12, 10)).toEqual({ age: 12, newStage: "adult" });
  });

  it("has one celebration for several ages crossed at once", () => {
    const before = named(hatched());
    const sim = feedWeek({ ...before, pet: { ...before.pet, xp: 100 } }, 10, S);
    expect(sim.pet.lastBirthday).toMatchObject({ age: 2, fromAge: 0 });
    expect(view(sim)).toMatchObject({ celebrating: { age: 2, newStage: "child" } });
  });

  it("pauses while it can't see, and waits on a clock set back before the birthday", () => {
    const sim = named(child());
    const blind = { ...sim.pet, blind: "offline" as const };
    expect(viewPet(blind, later(sim, HOUR), S)).toMatchObject({ celebrating: null });
    expect(viewPet(sim.pet, later(sim, -HOUR), S)).toMatchObject({ celebrating: null });
  });
});

describe("neglect", () => {
  it("runs away after two empty weeks and comes back at the next meal", () => {
    let sim = named(child());
    sim = wait(sim, TO_FIRST_RESET + 2 * WEEK_MS + HOUR, S);
    expect(sim.pet.weeks).toEqual([55, 0, 0]);
    expect(types(sim).at(-1)).toBe("ran-away");
    expect(view(sim)).toMatchObject({ kind: "ran-away", age: 1, name: "Mochi" });

    sim = wait(sim, WEEK_MS, S);
    expect(count(sim, "ran-away")).toBe(1);
    expect(sim.pet.age).toBe(1); // Weeks alone no longer age it.

    sim = feed(sim, 10, S);
    expect(sim.events.at(-1)).toMatchObject({ type: "came-back" });
    // Back with its age and name intact, a little worse for wear.
    sim = wait(sim, 10 * MINUTE, S);
    expect(view(sim)).toMatchObject({ kind: "pet", age: 1, name: "Mochi", mood: "sulky" });
  });

  it("does not let a baby run away", () => {
    const sim = wait(hatched(), TO_FIRST_RESET + 2 * WEEK_MS + HOUR, S);
    expect(sim.pet.weeks).toEqual([5, 0, 0]);
    expect(count(sim, "ran-away")).toBe(0);
    expect(view(sim)).toMatchObject({ kind: "pet", stage: "baby", mood: "hungry" });
  });

  it("does not run away from a week that was thin but not empty", () => {
    let sim = wait(child(), TO_FIRST_RESET + WEEK_MS + HOUR, S);
    sim = wait(feed(sim, 40, S), WEEK_MS, S);
    expect(sim.pet.weeks).toEqual([55, 0, 7]);
    expect(view(sim).kind).toBe("pet");
  });

  it("sulks after thin weeks and recovers when fed well", () => {
    let sim = wait(child(), TO_FIRST_RESET + HOUR, S);
    expect(sim.pet.weeks).toEqual([55]);
    expect(isUnderfed(sim.pet)).toBe(false); // One week of history is not enough.

    sim = wait(feed(sim, 40, S), WEEK_MS, S);
    sim = wait(feed(sim, 40, S), WEEK_MS, S);
    expect(sim.pet.weeks).toEqual([55, 7, 7]);
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
