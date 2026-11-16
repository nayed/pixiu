# Data source

## Summary

The extension reads the same JSON address that Claude's own usage settings page reads. A throwaway test extension confirmed on 2026-11-16 that this works from a Claude tab and from the background with no Claude tab open.

The address is undocumented. It can change without notice, and nobody has checked whether Anthropic's terms allow automated reads of it. Check that before publishing the extension.

## The request

```
GET https://claude.ai/api/organizations/{org_id}/usage
credentials: include   (the user's normal claude.ai session cookies)
accept: application/json
```

- No API key and no extra login. It relies on the user being signed in to claude.ai in the same Chrome profile.
- The manifest needs `host_permissions` for `https://claude.ai/*`.
- The lead for this address came from the author of an existing usage extension (Claude Monitor). The test confirmed it.

## Finding the organization ID

The test extension never asks for the ID. A content script on claude.ai looks at the URLs the page itself requests (through the browser's resource timing entries), matches `/api/organizations/{uuid}/`, and stores the ID in `chrome.storage.local`. The background worker then uses the stored ID.

This means the user must open claude.ai once after installing. Until then the pet has no data. Working code: `reference/data-test-extension/content.js`.

## What the test proved

| Question | Result |
|---|---|
| Read from inside a Claude tab | Yes, every attempt |
| Read from the background with a Claude tab open | Yes, every attempt |
| Read from the background with no Claude tab open | Yes, 26 of 26 |
| Values match the usage page | Yes, exactly (session percent, weekly percent, both reset times) |

The run made 30 reads over about an hour, one every 2 minutes, with no failures and no sign of throttling. That is a short run. It does not establish a safe polling rate.

**Proposed:** poll every 5 minutes from the background using `chrome.alarms`.

Because the background read works without a tab, usage from Claude Code and the desktop app reaches the pet without the user visiting claude.ai.

## Response shape

Trimmed to the fields that matter, with sample values from the test.

```json
{
  "limits": [
    { "kind": "session",       "group": "session", "percent": 0,  "resets_at": null, "is_active": false, "severity": "normal", "scope": null },
    { "kind": "weekly_all",    "group": "weekly",  "percent": 26, "resets_at": "2026-11-19T04:00:00.828692+00:00", "is_active": true, "severity": "normal", "scope": null },
    { "kind": "weekly_scoped", "group": "weekly",  "percent": 20, "resets_at": "2026-11-19T04:00:00.829177+00:00", "is_active": false, "severity": "normal",
      "scope": { "model": { "display_name": "Fable", "id": null }, "surface": null } }
  ],
  "five_hour": { "utilization": 0,  "resets_at": null },
  "seven_day": { "utilization": 26, "resets_at": "2026-11-19T04:00:00.828692+00:00" },
  "seven_day_breakdown": {
    "rows": [
      { "key": "claude_code", "display_name": "Claude Code", "percent": 16 },
      { "key": "chat",        "display_name": "Chats",       "percent": 0 },
      { "key": "cowork",      "display_name": "Cowork",      "percent": 84 },
      { "key": "other",       "display_name": "Other",       "percent": 0 }
    ],
    "window_started_at": "2026-11-12T04:00:00.828692+00:00"
  },
  "extra_usage": { "is_enabled": false }
}
```

How to read it:

- **Prefer `limits`.** Find the entry with `kind: "session"` and the one with `kind: "weekly_all"`. Use `percent` and `resets_at`.
- **Fall back to `five_hour` and `seven_day`**, which carry the same numbers as `utilization` and `resets_at`.
- **No session running** shows as the session entry at 0% with `resets_at` set to null. A filled `resets_at` means a session is open, even at 0%.
- **Percentages were whole numbers** in every sample. Do not rely on finer steps.
- **`weekly_scoped`** is a separate weekly limit for one model. Proposed: ignore it.
- **`seven_day_breakdown`** splits the week's usage by product. The rows are shares that add up to 100. Not needed for version one.
- **`extra_usage`** describes usage credits. The test account had them off.
- **What `is_active` means is unknown.** Do not build on it.

The full response also contains more than twenty fields with placeholder-style names (`amber_cistern`, `granite_teacup`, and so on), all null in the test. That suggests the shape is edited often. Treat every field as possibly missing, and never fail hard on an unexpected shape.

## Failure cases

| What happens | Likely cause | Pet state |
|---|---|---|
| Response is not JSON, or 401/403 | Signed out of claude.ai, or a bot check | Can't reach Claude: signed out |
| Network error | Offline | Can't reach Claude: offline |
| JSON without the expected fields | Claude changed the response | Can't reach Claude: changed |
| No organization ID stored yet | The user has not opened claude.ai since install | Open: needs its own first-run message |

Only the first row's cause is inferred, not observed. The test never ran signed out.

## Observations worth keeping

- At 3:49 PM the session read 0% and at 3:51 PM it read 22%, in one step. Usage arrives in jumps.
- That same 22% of a session moved the week from 22% to 26%. On this Pro account a full session is worth roughly 18% of the week. This is one sample.
- A session that had been open at 0% for hours took that usage and still reset at its original time.
- The weekly reset for this account is Thursday 05:00 Paris time. It is fixed per account.

## Normalized shape for the pet logic

**Proposed.** The pet logic should not know about Claude's response. A provider adapter returns this:

```ts
type UsageSnapshot = {
  ok: true;
  readAt: string;                                   // ISO time of the read
  short: { percent: number; resetsAt: string | null };   // Claude: the five-hour session
  long:  { percent: number; resetsAt: string | null };   // Claude: the weekly limit
} | {
  ok: false;
  readAt: string;
  reason: "signed-out" | "offline" | "changed" | "not-set-up";
};
```

A future adapter for another provider only has to produce the same shape.

## Privacy

- The extension talks only to claude.ai.
- State lives in `chrome.storage.local`. Nothing is sent anywhere else.
- The raw response can include account details. Do not log it in production builds.
