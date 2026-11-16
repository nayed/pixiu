import { describe, expect, it } from "vitest";
import { agoText, untilText } from "./format";

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
