import { describe, expect, it } from "vitest";
import { grow, growthOf, xpToGrow } from "./growth";

describe("xpToGrow", () => {
  it("costs 50 for age 1 and 10 more for each age after", () => {
    expect(xpToGrow(0)).toBe(50);
    expect(xpToGrow(1)).toBe(60);
    expect(xpToGrow(6)).toBe(110);
    expect(xpToGrow(11)).toBe(160);
  });
});

describe("grow", () => {
  it("waits until the XP pays for the next age", () => {
    expect(grow(0, 49)).toEqual({ age: 0, xp: 49 });
    expect(grow(0, 50)).toEqual({ age: 1, xp: 0 });
  });

  it("keeps the XP left over", () => {
    expect(grow(1, 64)).toEqual({ age: 2, xp: 4 });
  });

  it("can cross several ages at once", () => {
    expect(grow(0, 180)).toEqual({ age: 3, xp: 0 });
  });

  it("reaches the teen and adult ages at 560 and 1,260 XP", () => {
    expect(grow(0, 559)).toEqual({ age: 6, xp: 109 });
    expect(grow(0, 560)).toEqual({ age: 7, xp: 0 });
    expect(grow(0, 1_259)).toEqual({ age: 11, xp: 159 });
    expect(grow(0, 1_260)).toEqual({ age: 12, xp: 0 });
  });
});

describe("growthOf", () => {
  it("shows whole XP toward the next age", () => {
    expect(growthOf({ age: 2, xp: 4.6 })).toEqual({ xp: 4, needed: 70, nextAge: 3 });
  });

  it("shows a pet that has earned its birthday as full until it has it", () => {
    expect(growthOf({ age: 1, xp: 64 })).toEqual({ xp: 60, needed: 60, nextAge: 2 });
  });
});
