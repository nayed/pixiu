# Version one

## In scope

Agreed with Nayed after the data test. All of it is built, and it was released on GitHub as 0.1.0 together with the on-page overlay. Since then the pet ages with XP instead of on the weekly reset (RULES.md).

- The egg, with warmth and cracks.
- The hatching moment, including naming the pet.
- The four life stages (baby, child, teen, adult) with their moods.
- The popup.
- The toolbar icon with its changing face and badge.
- The "can't reach Claude" state.
- Reading Claude plan usage from the background, with no Claude tab needed.
- Aging on the weekly reset. Replaced after version one by aging with XP from weekly usage; see RULES.md.
- Sulking and running away.

## Deliberately later

- **The on-page overlay.** It is fully designed, and Nayed wants it. It waits because it is the only piece that depends on a page the extension does not control. It is the first thing to add after version one. **Built** right after version one, and part of 0.1.0.
- Adult variants that depend on care.
- Retirement, the album, and inherited traits.
- Generations and lifetime milestones.
- Showing what the pet ate, from the per-product breakdown.
- Other providers.

## Open questions

Ask Nayed before building anything that depends on these.

### Blocking the first milestones

1. **Tech stack.** Never discussed. Nayed has a React and frontend background. The popup is one small screen and the sprites are static images, so a framework is optional. Propose one and get agreement before writing code. **Settled:** WXT with Preact and TypeScript, Vitest for tests, Biome for lint and format, and pnpm.
2. **Hunger threshold.** How many hours without a meal make the pet hungry. **Settled:** 6 waking hours.
3. **Sleeping hours.** Fixed, configurable, or learned from habits. **Settled:** configurable in settings, 23:00 to 08:00 by default.
4. **Sulky threshold.** How underfed, over how many weeks, turns the pet sulky. The design says "about the last four weeks." **Settled:** an average weekly peak under 25% over the last four completed weeks, after at least two weeks of history.
5. **What counts as an empty week** for running away. The design says "about two empty weeks." **Settled:** a weekly peak under 5%. Two in a row, and the pet runs away.
6. **First run before any data.** The extension only learns the organization ID after the user opens claude.ai once. That moment has no design. **Settled:** the egg, with "One step to go" and an Open Claude button (`artboards/first-run-popup.png`).

### Can be settled during the build

7. **Age boundaries.** Child 1 to 6, teen 7 to 11, adult 12 and up are proposed, not confirmed. **Built** as proposed. Ages now come from XP (RULES.md).
8. **Egg crack thresholds.** The warmth values for the first crack and the full crack. **Built:** 40% and 90%.
9. **Polling interval.** 5 minutes is proposed. 2 minutes worked for an hour in testing. **Settled:** every 5 minutes, and every 30 seconds while a claude.ai tab is in front and in use.
10. **Paused time during an outage.** Proposed: the pet does not get hungry while it can't reach Claude. **Built** as proposed.
11. **Badge text.** The `62`, `!`, `zz`, `?` scheme is proposed. **Built** as proposed.
12. **Settings.** The popup has a settings button and promises renaming there. Nothing else in settings is designed. **Built:** renaming, sleeping hours, and a link to the backup page, which exports the pet to a file and imports it again.
13. **Usage credits.** What a stuffed pet does when usage continues past 100%. Still open.
14. **Accounts with no session limit.** Still open. Such an egg never hatches today.
15. **Early limit resets.** Proposed: treat like a normal reset. **Built:** treated like a normal reset.

### Before publishing

16. **Terms.** Whether Anthropic's terms allow automated reads of the usage address. Unchecked. **Settled:** Nayed chose to publish on GitHub, as other personal usage tools do, without a formal check.
17. **The name.** Whether "Pixiu" collides with something on the Chrome Web Store or GitHub. **Settled:** kept, without a further search.
18. **Whether to publish at all**, and where. Never discussed. **Settled:** published on GitHub (nayed/pixiu), with a zip on each release. Not on the Chrome Web Store.
19. **Font licenses** for bundling Pixelify Sans and VT323. **Settled:** both fonts are under the Open Font License, and their license texts ship with the extension. Pixelify Sans was replaced by Jersey 15.
20. **A license for the repo.** Never discussed. **Settled:** MIT.

## Definition of done for version one

All of it was met in 0.1.0.

- Installing the extension shows an egg in the popup and on the toolbar.
- After the user has opened claude.ai once, using Claude from any surface (including Claude Code) warms the egg within one polling interval.
- The egg hatches, the user names the pet, and the name persists.
- The pet's mood follows the rules in RULES.md, and the popup and the toolbar icon always agree.
- The pet ages by one at the weekly reset. (Version one. Since then it ages with XP; see RULES.md.)
- Signing out of Claude turns the pet gray with a `?` badge, and signing back in restores it with no lost history.
- Closing and reopening the browser loses nothing.
