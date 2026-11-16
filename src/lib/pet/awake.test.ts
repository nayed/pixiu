import { describe, expect, it } from "vitest";
import { awakeMs } from "./awake";

// The tests run in UTC (see vitest.config.ts), so local time is UTC here.
const HOUR = 3_600_000;
const night = { startMinute: 23 * 60, endMinute: 8 * 60 };
const at = (iso: string) => Date.parse(iso);

describe("awakeMs", () => {
  it("runs the tests in UTC", () => {
    expect(new Date().getTimezoneOffset()).toBe(0);
  });

  it("counts a daytime span in full", () => {
    expect(awakeMs(at("2026-11-16T10:00Z"), at("2026-11-16T15:30Z"), night)).toBe(5.5 * HOUR);
  });

  it("counts nothing inside the night", () => {
    expect(awakeMs(at("2026-11-16T23:30Z"), at("2026-11-17T07:00Z"), night)).toBe(0);
  });

  it("skips the night in a span that crosses it", () => {
    expect(awakeMs(at("2026-11-16T21:00Z"), at("2026-11-17T10:00Z"), night)).toBe(4 * HOUR);
  });

  it("handles a span that starts after midnight, in a night that began the day before", () => {
    expect(awakeMs(at("2026-11-17T02:00Z"), at("2026-11-17T09:00Z"), night)).toBe(1 * HOUR);
  });

  it("skips every night in a span of several days", () => {
    expect(awakeMs(at("2026-11-16T12:00Z"), at("2026-11-19T12:00Z"), night)).toBe(3 * 15 * HOUR);
  });

  it("handles sleeping hours that do not cross midnight", () => {
    const nap = { startMinute: 13 * 60, endMinute: 14 * 60 };
    expect(awakeMs(at("2026-11-16T12:00Z"), at("2026-11-16T15:00Z"), nap)).toBe(2 * HOUR);
  });

  it("counts everything when the sleeping hours are empty", () => {
    const none = { startMinute: 0, endMinute: 0 };
    expect(awakeMs(at("2026-11-16T00:00Z"), at("2026-11-17T00:00Z"), none)).toBe(24 * HOUR);
  });

  it("returns zero for an empty or backward span", () => {
    expect(awakeMs(at("2026-11-16T12:00Z"), at("2026-11-16T11:00Z"), night)).toBe(0);
  });
});
