import { describe, expect, it } from "vitest";
import { toolbarIcon } from "./icon";
import { DEFAULT_SETTINGS as S } from "./pet/config";
import { namePet } from "./pet/engine";
import type { PetState } from "./pet/state";
import { viewPet } from "./pet/view";
import {
  createSimulation,
  feed,
  feedWeek,
  poll,
  type Simulation,
  setFailure,
  wait,
} from "./sim/simulation";
import { sprite } from "./sprites/sprites";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const WEEK = 7 * 24 * HOUR;
const START = new Date("2026-11-16T12:00:00Z");

const install = () => poll(createSimulation(START, new Date("2026-11-19T04:00:00Z")), S);
const named = (sim: Simulation): Simulation => ({ ...sim, pet: namePet(sim.pet, "Mochi") });
/** The same pet, aged to 1. These tests are about the icon, not about earning the XP. */
const asChild = (sim: Simulation): Simulation => ({ ...sim, pet: { ...sim.pet, age: 1 } });

function iconOf(sim: Simulation) {
  const now = new Date(sim.fake.now);
  return toolbarIcon(viewPet(sim.pet, now, S), sim.pet, now);
}

describe("toolbarIcon", () => {
  it("is the egg with no badge before hatching, cracking as it warms", () => {
    expect(iconOf(install())).toMatchObject({ sprite: sprite("egg-new"), badge: "" });
    expect(iconOf(feed(install(), 12, S)).sprite).toBe(sprite("egg-warming"));
    expect(iconOf(feed(install(), 27, S)).sprite).toBe(sprite("egg-hatching"));
  });

  it("asks for attention before the account is found", () => {
    const sim = setFailure(createSimulation(START, START), "not-set-up", S);
    expect(iconOf(sim)).toMatchObject({ sprite: sprite("egg-new"), badge: "!", tone: "food" });
  });

  it("keeps a ! badge on the hatched baby until it has a name", () => {
    const hatched = feed(install(), 30, S);
    expect(iconOf(hatched)).toMatchObject({ sprite: sprite("hatch-hatched"), badge: "!" });
    expect(iconOf(named(hatched)).badge).toBe("30");
  });

  it("shows the session percent while happy, and the happy face while eating", () => {
    const eating = named(feed(install(), 62, S));
    expect(iconOf(eating)).toMatchObject({ sprite: sprite("baby-face-happy"), badge: "62" });
    const happy = wait(eating, 10 * MINUTE, S);
    expect(iconOf(happy)).toMatchObject({ sprite: sprite("baby-face-happy"), badge: "62" });
  });

  it("shows 0 once the session has reset, even before the next read", () => {
    const sim = named(feed(install(), 62, S));
    const later = new Date(sim.fake.now + 5 * HOUR + MINUTE);
    const pet: PetState = { ...sim.pet, lastMealAt: later.toISOString(), hungerMs: 0 };
    const quiet = {
      ...pet,
      reading: pet.reading && { ...pet.reading, readAt: later.toISOString() },
    };
    expect(toolbarIcon(viewPet(quiet, later, S), quiet, later).badge).toBe("0");
  });

  it("shows ! when hungry and zz when stuffed", () => {
    const hungry = wait(named(feed(install(), 30, S)), 7 * HOUR, S);
    expect(iconOf(hungry)).toMatchObject({ sprite: sprite("baby-face-hungry"), badge: "!" });
    const stuffed = wait(feed(named(feed(install(), 30, S)), 78, S), 10 * MINUTE, S);
    expect(iconOf(stuffed)).toMatchObject({ sprite: sprite("baby-face-stuffed"), badge: "zz" });
  });

  it("shows the sulky face with the session percent", () => {
    let sim = wait(asChild(named(feed(install(), 40, S))), WEEK, S);
    sim = wait(feed(sim, 40, S), WEEK, S);
    sim = wait(feed(sim, 20, S), 10 * MINUTE, S);
    expect(iconOf(sim)).toMatchObject({ sprite: sprite("child-face-sulky"), badge: "20" });
  });

  it("is the note with no badge when the pet ran away", () => {
    const sim = wait(asChild(named(feed(install(), 30, S))), 3 * WEEK, S);
    expect(iconOf(sim)).toMatchObject({ sprite: sprite("note-ran-away"), badge: "" });
  });

  it("turns gray with a ? badge when Claude can't be reached", () => {
    const pet = setFailure(wait(asChild(named(feed(install(), 30, S))), WEEK, S), "signed-out", S);
    expect(iconOf(pet)).toMatchObject({
      sprite: sprite("child-face-lost"),
      badge: "?",
      tone: "lost",
    });
    const egg = setFailure(install(), "offline", S);
    expect(iconOf(egg)).toMatchObject({ sprite: sprite("egg-new"), badge: "?", tone: "lost" });
  });

  it("says it is a birthday in the tooltip for a day, and keeps the food badge", () => {
    const sim = named(feedWeek(feed(install(), 30, S), 50, S));
    expect(iconOf(sim)).toMatchObject({
      badge: "30",
      title: expect.stringMatching(/Birthday today!$/),
    });
    expect(iconOf(wait(sim, 25 * HOUR, S)).title).not.toMatch(/Birthday/);
  });

  it("never has a badge longer than three characters, and always has a tooltip", () => {
    let sim = named(feed(install(), 30, S));
    for (let step = 0; step < 60; step++) {
      sim = wait(feed(sim, step % 7 === 0 ? 100 : 3, S), 9 * HOUR, S);
      const icon = iconOf(sim);
      expect(icon.badge.length).toBeLessThanOrEqual(3);
      expect(icon.title).toMatch(/^Pixiu: ./);
    }
  });
});
