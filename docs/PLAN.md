# Build plan

A suggested order. Everything here is a proposal from the design conversation; adjust it once the tech stack is agreed.

## Shape of the extension

Chrome extension, Manifest V3.

| Part | Job |
|---|---|
| Background service worker | Owns the pet's state. Polls usage on a `chrome.alarms` schedule, runs the rules, saves to `chrome.storage.local`, updates the toolbar icon and badge. |
| Content script on claude.ai | Finds the organization ID and stores it. Later, draws the on-page overlay. |
| Popup | Reads state from storage and renders it. Sends the name at hatching. |
| Claude adapter | Turns the usage response into the normalized snapshot in DATA.md. The only Claude-specific code. |
| Pet engine | A pure function: previous state plus a snapshot plus the current time gives the next state. No browser APIs, so it can be unit tested. |

The service worker is not kept alive between polls, so it must hold nothing in memory. Read state from storage at the start of every wake-up and write it back at the end.

## Milestones

### 1. Skeleton and data

- Scaffold the extension with the agreed stack.
- Port the organization ID discovery and the usage read from `reference/data-test-extension/`.
- Write the Claude adapter with defensive parsing (prefer `limits`, fall back to `five_hour` and `seven_day`, never throw on an unexpected shape).
- Store snapshots. Show raw numbers in a bare popup.

Done when: the popup shows the same two percentages and reset times as Claude's usage page.

### 2. Pet engine

- Implement the state and rules from RULES.md as a pure module.
- Cover it with unit tests using scripted sequences of snapshots: a jump from 0% to 22%, a session reset, a weekly reset, an outage, two empty weeks.
- Needs the answers to open questions 2 to 5 in MVP.md.

Done when: the tests pass and the engine, fed live snapshots, logs sensible state changes.

### 3. Popup

- Build the popup from `artboards/*-popup.png` using the sprites in `assets/sprites/`.
- Egg, hatching with naming, the four stages, moods, cookies, growth ruler.
- Animations from DESIGN.md.

Done when: every popup artboard can be reproduced by putting the engine in the matching state.

### 4. Toolbar icon

- Set the icon from the face sprites and the badge text from the state.
- Play the three hatch frames once at hatching.
- Check on light and dark toolbars.

### 5. Can't reach Claude

- Map read failures to the three reasons.
- Gray popup, gray icon, `?` badge.
- Pause hunger and neglect while unreachable, if that proposal is confirmed.

### 6. Hardening

- Browser restart, long sleep, clock changes, and time zones (the weekly reset time comes from the response, so trust it over local arithmetic).
- A debug page or flag that can force any state, for checking visuals without waiting weeks.
- The checks listed under "Before publishing" in MVP.md.

### After version one

The on-page overlay, built from `artboards/*-on-page-overlay.png`.

## A testing note

The pet's life runs over months. Build the debug control in milestone 2, not at the end: a way to feed the engine fake snapshots and a fake clock. Without it, most of the pet's states cannot be seen during development.
