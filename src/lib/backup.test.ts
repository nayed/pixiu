import { describe, expect, it } from "vitest";
import { createBackup, parseBackup, validateBackup } from "./backup";
import { DEFAULT_SETTINGS } from "./pet/config";
import { namePet } from "./pet/engine";
import { createSimulation, feed, feedWeek, poll, wait } from "./sim/simulation";

const START = new Date("2026-11-16T12:00:00Z");
const NOW = new Date("2026-11-20T09:00:00Z");

/** A named child with a reading, a meal, and a completed week behind it. */
function grownPet() {
  let sim = poll(createSimulation(START, new Date("2026-11-19T04:00:00Z")), DEFAULT_SETTINGS);
  sim = feed(sim, 22, DEFAULT_SETTINGS);
  sim = feedWeek(sim, 50, DEFAULT_SETTINGS);
  sim = wait(sim, 3 * 24 * 3_600_000, DEFAULT_SETTINGS);
  return namePet(sim.pet, "Mochi");
}

const log = [{ at: START.toISOString(), text: "Hatched" }];

describe("backup", () => {
  it("survives a round trip through a file", () => {
    const pet = grownPet();
    const backup = createBackup(pet, DEFAULT_SETTINGS, log, NOW);
    const restored = parseBackup(JSON.stringify(backup));
    expect(restored).toEqual(backup);
    expect(restored?.pet).toEqual(pet);
    expect(restored?.pet.age).toBe(1);
  });

  it("brings a pet saved by 0.1.0 up to date, crediting this week's usage as XP", () => {
    const { xp: _xp, lastBirthday: _birthday, ...rest } = grownPet();
    const old = { ...rest, version: 1 };
    const backup = createBackup(old as never, undefined, undefined, NOW);
    const restored = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored?.pet).toEqual({ ...rest, version: 3, xp: rest.weekPeak, lastBirthday: null });
  });

  it("brings a pet saved by 0.2.0 up to date, with no birthday on record", () => {
    const { lastBirthday: _birthday, ...rest } = grownPet();
    const backup = createBackup({ ...rest, version: 2 } as never, undefined, undefined, NOW);
    const restored = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored?.pet).toEqual({ ...rest, version: 3, lastBirthday: null });
  });

  it("keeps the pet when the settings and the log are missing or broken", () => {
    const backup = { ...createBackup(grownPet(), undefined, undefined, NOW), log: "nope" };
    const restored = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(restored?.pet.name).toBe("Mochi");
    expect(restored?.settings).toBeUndefined();
    expect(restored?.log).toBeUndefined();
  });

  it("drops fields it does not know", () => {
    const backup = { ...createBackup(grownPet(), DEFAULT_SETTINGS, log, NOW), orgId: "secret" };
    expect(validateBackup(backup)).not.toHaveProperty("orgId");
  });

  it.each([
    ["text that is not JSON", "not json"],
    ["JSON that is not a backup", '{"hello":"world"}'],
    [
      "another version",
      JSON.stringify({ ...createBackup(grownPet(), undefined, undefined, NOW), version: 2 }),
    ],
    ["a missing pet", JSON.stringify({ format: "pixiu-backup", version: 1, exportedAt: NOW })],
  ])("rejects %s", (_name, text) => {
    expect(parseBackup(text)).toBeNull();
  });

  it.each([
    ["a negative age", { age: -1 }],
    ["a text age", { age: "3" }],
    ["negative XP", { xp: -1 }],
    ["no XP", { xp: undefined }],
    ["a broken birthday", { lastBirthday: { at: "yesterday", age: 1, fromAge: 0 } }],
    ["no birthday field", { lastBirthday: undefined }],
    ["an unreadable time", { hatchedAt: "yesterday" }],
    ["weeks that are not numbers", { weeks: ["a lot"] }],
    ["a broken reading", { reading: { ok: true, readAt: "2026-11-20T09:00:00Z" } }],
    ["a missing field", { ranAway: undefined }],
  ])("rejects a pet with %s", (_name, damage) => {
    const backup = createBackup({ ...grownPet(), ...damage } as never, undefined, undefined, NOW);
    expect(validateBackup(JSON.parse(JSON.stringify(backup)))).toBeNull();
  });
});
