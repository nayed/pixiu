import { describe, expect, it } from "vitest";
import { ACTIVE_FOR_MS, READ_EVERY_MS, wantsRead } from "./activity";

const NOW = 1_000_000_000;
const inUse = { now: NOW, visible: true, lastActiveAt: NOW - 1_000, lastReadAt: 0 };

describe("wantsRead", () => {
  it("reads while the page is in front and in use", () => {
    expect(wantsRead(inUse)).toBe(true);
  });

  it("waits between reads", () => {
    expect(wantsRead({ ...inUse, lastReadAt: NOW - READ_EVERY_MS + 1 })).toBe(false);
    expect(wantsRead({ ...inUse, lastReadAt: NOW - READ_EVERY_MS })).toBe(true);
  });

  it("stops when the page has not been used for a while", () => {
    expect(wantsRead({ ...inUse, lastActiveAt: NOW - ACTIVE_FOR_MS })).toBe(false);
  });

  it("stops when the tab is not showing", () => {
    expect(wantsRead({ ...inUse, visible: false })).toBe(false);
  });
});
