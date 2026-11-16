# Version one

## In scope

Agreed with Nayed after the data test.

- The egg, with warmth and cracks.
- The hatching moment, including naming the pet.
- The four life stages (baby, child, teen, adult) with their moods.
- The popup.
- The toolbar icon with its changing face and badge.
- The "can't reach Claude" state.
- Reading Claude plan usage from the background, with no Claude tab needed.
- Aging on the weekly reset.
- Sulking and running away.

## Deliberately later

- **The on-page overlay.** It is fully designed, and Nayed wants it. It waits because it is the only piece that depends on a page the extension does not control. It is the first thing to add after version one.
- Adult variants that depend on care.
- Retirement, the album, and inherited traits.
- Generations and lifetime milestones.
- Showing what the pet ate, from the per-product breakdown.
- Other providers.

## Open questions

Ask Nayed before building anything that depends on these.

### Blocking the first milestones

1. **Tech stack.** Never discussed. Nayed has a React and frontend background. The popup is one small screen and the sprites are static images, so a framework is optional. Propose one and get agreement before writing code.
2. **Hunger threshold.** How many hours without a meal make the pet hungry.
3. **Sleeping hours.** Fixed, configurable, or learned from habits.
4. **Sulky threshold.** How underfed, over how many weeks, turns the pet sulky. The design says "about the last four weeks."
5. **What counts as an empty week** for running away. The design says "about two empty weeks."
6. **First run before any data.** The extension only learns the organization ID after the user opens claude.ai once. That moment has no design.

### Can be settled during the build

7. **Age boundaries.** Child 1 to 6, teen 7 to 11, adult 12 and up are proposed, not confirmed.
8. **Egg crack thresholds.** The warmth values for the first crack and the full crack.
9. **Polling interval.** 5 minutes is proposed. 2 minutes worked for an hour in testing.
10. **Paused time during an outage.** Proposed: the pet does not get hungry while it can't reach Claude.
11. **Badge text.** The `62`, `!`, `zz`, `?` scheme is proposed.
12. **Settings.** The popup has a settings button and promises renaming there. Nothing else in settings is designed.
13. **Usage credits.** What a stuffed pet does when usage continues past 100%.
14. **Accounts with no session limit.**
15. **Early limit resets.** Proposed: treat like a normal reset.

### Before publishing

16. **Terms.** Whether Anthropic's terms allow automated reads of the usage address. Unchecked.
17. **The name.** Whether "Pixiu" collides with something on the Chrome Web Store or GitHub.
18. **Whether to publish at all**, and where. Never discussed.
19. **Font licenses** for bundling Pixelify Sans and VT323.
20. **A license for the repo.** Never discussed.

## Definition of done for version one

- Installing the extension shows an egg in the popup and on the toolbar.
- After the user has opened claude.ai once, using Claude from any surface (including Claude Code) warms the egg within one polling interval.
- The egg hatches, the user names the pet, and the name persists.
- The pet's mood follows the rules in RULES.md, and the popup and the toolbar icon always agree.
- The pet ages by one at the weekly reset.
- Signing out of Claude turns the pet gray with a `?` badge, and signing back in restores it with no lost history.
- Closing and reopening the browser loses nothing.
