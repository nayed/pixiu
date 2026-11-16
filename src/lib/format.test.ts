import { describe, expect, it } from "vitest";
import { agoText, clockToMinutes, minutesToClock, timeLeftText, untilText } from "./format";

const now = new Date("2026-11-16T12:00:00Z");

describe("untilText", () => {
  it.each([
    ["2026-11-16T12:25:00Z", "in 25 min"],
    ["2026-11-16T14:10:00Z", "in 2 h 10 min"],
    ["2026-11-19T16:00:00Z", "in 3 d 4 h"],
    ["2026-11-16T11:59:00Z", "any moment"],
  ])("%s reads as %s", (iso, text) => {
    expect(untilText(iso, now)).toBe(text);
  });
});

describe("agoText", () => {
  it.each([
    ["2026-11-16T11:59:40Z", "just now"],
    ["2026-11-16T11:48:00Z", "12 min ago"],
    ["2026-11-16T09:00:00Z", "3 h 0 min ago"],
  ])("%s reads as %s", (iso, text) => {
    expect(agoText(iso, now)).toBe(text);
  });
});

describe("timeLeftText", () => {
  it("gives the length without a prefix", () => {
    expect(timeLeftText("2026-11-16T13:25:00Z", now)).toBe("1 h 25 min");
    expect(timeLeftText("2026-11-16T11:00:00Z", now)).toBe("0 min");
  });
});

describe("clock times", () => {
  it("converts both ways", () => {
    expect(minutesToClock(23 * 60)).toBe("23:00");
    expect(minutesToClock(8 * 60 + 5)).toBe("08:05");
    expect(clockToMinutes("23:00")).toBe(1380);
    expect(clockToMinutes("08:05")).toBe(485);
  });

  it.each(["", "25:00", "12:60", "noon"])("rejects %j", (text) => {
    expect(clockToMinutes(text)).toBeNull();
  });
});
