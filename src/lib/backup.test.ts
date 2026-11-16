import { describe, expect, it } from "vitest";
import { createBackup, parseBackup, validateBackup } from "./backup";
import { DEFAULT_SETTINGS } from "./pet/config";
import { namePet } from "./pet/engine";
import { createSimulation, feed, poll, wait } from "./sim/simulation";

const START = new Date("2026-11-16T12:00:00Z");
const NOW = new Date("2026-11-20T09:00:00Z");

/** A named child with a reading, a meal, and a completed week behind it. */
function grownPet() {
  let sim = poll(createSimulation(START, new Date("2026-11-19T04:00:00Z")), DEFAULT_SETTINGS);
  sim = feed(sim, 22, DEFAULT_SETTINGS);
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
    ["an unreadable time", { hatchedAt: "yesterday" }],
    ["weeks that are not numbers", { weeks: ["a lot"] }],
    ["a broken reading", { reading: { ok: true, readAt: "2026-11-20T09:00:00Z" } }],
    ["a missing field", { ranAway: undefined }],
  ])("rejects a pet with %s", (_name, damage) => {
    const backup = createBackup({ ...grownPet(), ...damage } as never, undefined, undefined, NOW);
    expect(validateBackup(JSON.parse(JSON.stringify(backup)))).toBeNull();
  });
});
