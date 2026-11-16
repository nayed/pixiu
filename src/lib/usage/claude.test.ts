import { describe, expect, it } from "vitest";
import { ORG_ID_PATTERN, parseUsage, readUsage } from "./claude";

const READ_AT = "2026-11-16T15:00:00.000Z";
const ORG_ID = "0a1b2c3d-1111-2222-3333-444455556666";

// Trimmed from the response recorded by the data test (docs/DATA.md).
const sample = {
  limits: [
    { kind: "session", group: "session", percent: 22, resets_at: "2026-11-16T19:00:00.5+00:00" },
    {
      kind: "weekly_all",
      group: "weekly",
      percent: 26,
      resets_at: "2026-11-19T04:00:00.828692+00:00",
    },
    {
      kind: "weekly_scoped",
      group: "weekly",
      percent: 20,
      resets_at: "2026-11-19T04:00:00.829177+00:00",
      scope: { model: { display_name: "Fable", id: null }, surface: null },
    },
  ],
  five_hour: { utilization: 99, resets_at: null },
  seven_day: { utilization: 98, resets_at: "2026-11-20T04:00:00+00:00" },
  amber_cistern: null,
};

describe("parseUsage", () => {
  it("prefers the limits entries and ignores the scoped weekly limit", () => {
    expect(parseUsage(sample, READ_AT)).toEqual({
      ok: true,
      readAt: READ_AT,
      short: { percent: 22, resetsAt: "2026-11-16T19:00:00.500Z" },
      long: { percent: 26, resetsAt: "2026-11-19T04:00:00.828Z" },
    });
  });

  it("falls back to five_hour and seven_day when limits is missing", () => {
    const { limits: _limits, ...legacy } = sample;
    expect(parseUsage(legacy, READ_AT)).toMatchObject({
      ok: true,
      short: { percent: 99, resetsAt: null },
      long: { percent: 98, resetsAt: "2026-11-20T04:00:00.000Z" },
    });
  });

  it("falls back per window when one limits entry is unusable", () => {
    const json = {
      ...sample,
      limits: [{ kind: "session", percent: "22", resets_at: null }, sample.limits[1]],
    };
    expect(parseUsage(json, READ_AT)).toMatchObject({
      ok: true,
      short: { percent: 99 },
      long: { percent: 26 },
    });
  });

  it("reads a session with no reset time as not running", () => {
    const json = { limits: [{ kind: "session", percent: 0, resets_at: null }, sample.limits[1]] };
    expect(parseUsage(json, READ_AT)).toMatchObject({ short: { percent: 0, resetsAt: null } });
  });

  it("treats a missing session limit as no session running", () => {
    expect(parseUsage({ seven_day: sample.seven_day }, READ_AT)).toMatchObject({
      ok: true,
      short: { percent: 0, resetsAt: null },
    });
  });

  it("keeps a percent above 100", () => {
    const json = { five_hour: { utilization: 130, resets_at: null }, seven_day: sample.seven_day };
    expect(parseUsage(json, READ_AT)).toMatchObject({ short: { percent: 130 } });
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", []],
    ["an empty object", {}],
    ["limits of the wrong type", { limits: "soon" }],
    ["a weekly limit with a bad percent", { seven_day: { utilization: Number.NaN } }],
    ["a weekly limit with an unreadable time", { seven_day: { utilization: 5, resets_at: "x" } }],
  ])("reports %s as changed without throwing", (_name, json) => {
    expect(parseUsage(json, READ_AT)).toEqual({ ok: false, readAt: READ_AT, reason: "changed" });
  });
});

describe("readUsage", () => {
  const now = () => new Date(READ_AT);
  const respond = (body: string, status = 200) =>
    (async () => new Response(body, { status })) as typeof fetch;

  it("requests the usage address with the session cookies", async () => {
    const calls: [unknown, RequestInit | undefined][] = [];
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      calls.push([url, init]);
      return new Response(JSON.stringify(sample));
    }) as typeof fetch;

    const snapshot = await readUsage(ORG_ID, fetchFn, now);

    expect(snapshot).toMatchObject({ ok: true, readAt: READ_AT, long: { percent: 26 } });
    expect(calls).toEqual([
      [
        `https://claude.ai/api/organizations/${ORG_ID}/usage`,
        { credentials: "include", headers: { accept: "application/json" } },
      ],
    ]);
  });

  it("reports not-set-up without a request when there is no organization ID", async () => {
    const fetchFn = (async () => {
      throw new Error("must not be called");
    }) as typeof fetch;
    expect(await readUsage(null, fetchFn, now)).toEqual({
      ok: false,
      readAt: READ_AT,
      reason: "not-set-up",
    });
  });

  it("reports offline when the request fails", async () => {
    const fetchFn = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    expect(await readUsage(ORG_ID, fetchFn, now)).toMatchObject({ ok: false, reason: "offline" });
  });

  it.each([401, 403])("reports signed-out on HTTP %i", async (status) => {
    expect(await readUsage(ORG_ID, respond("{}", status), now)).toMatchObject({
      reason: "signed-out",
    });
  });

  it("reports signed-out when the response is a page, not JSON", async () => {
    expect(
      await readUsage(ORG_ID, respond("<!doctype html><title>Log in</title>"), now),
    ).toMatchObject({ reason: "signed-out" });
  });

  it("reports offline on a server error", async () => {
    expect(await readUsage(ORG_ID, respond("oops", 503), now)).toMatchObject({ reason: "offline" });
  });

  it("reports changed when the JSON has no usable fields", async () => {
    expect(await readUsage(ORG_ID, respond('{"granite_teacup":null}'), now)).toMatchObject({
      reason: "changed",
    });
  });
});

describe("ORG_ID_PATTERN", () => {
  it("finds the organization ID in a request URL", () => {
    const url = `https://claude.ai/api/organizations/${ORG_ID}/chat_conversations?limit=30`;
    expect(ORG_ID_PATTERN.exec(url)?.[1]).toBe(ORG_ID);
  });

  it("ignores other URLs", () => {
    expect(ORG_ID_PATTERN.exec("https://claude.ai/api/account")).toBeNull();
  });
});
