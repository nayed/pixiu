# Pet rules

Status words (Decided, Proposed, Open) are explained in README.md.

## Inputs

The pet logic sees only this, refreshed on each poll:

- `session.percent`: 0 to 100, whole numbers in every sample seen.
- `session.resetsAt`: a time, or empty when no session is running.
- `week.percent`: 0 to 100.
- `week.resetsAt`: a time.
- Whether the read succeeded.

## Feeding

- **Decided:** usage is food, and more is better.
- **Decided:** the session percent is how full the pet is. It is shown as ten cookies, one per 10%.
- **Decided (from the data test):** a "bite" is a rise of one percentage point, not one message. The extension cannot count messages, because usage from Claude Code and the desktop app never passes through the browser page.
- **Decided (from the data test):** meals arrive in jumps. One poll saw the session go from 0% to 22%. The eating animation must handle "ate two cookies at once" as well as a single point.
- **Decided:** at 100% of the session the pet is stuffed and content. It naps until the session resets.
- **Decided:** a light session carries no penalty.

## Hunger

- **Decided:** hunger comes from time since the last meal, where a meal is any rise in the session or weekly percent. It does not come from the session bar being low, and it does not come from whether a session exists. A session can be open at 0%.
- **Proposed:** the pet has sleeping hours, like the original toy, so it does not go hungry overnight.
- **Open:** how many hours without a meal make the pet hungry, and what the sleeping hours are (fixed, configurable, or learned from the user's habits). The mockup shows "last meal was 9 hours ago" as a sample only.

## Growth and age

- **Decided (Nayed, 2026-11-25):** growth is XP. Each point the weekly percent rises is 1 XP, counted from hatching. The weekly reset sends Claude's percent back to 0, but the pet keeps the XP it earned.
- **Decided (Nayed, 2026-11-25):** the pet ages up when its XP pays for the next age. Age 1 costs 50 XP and each later age costs 10 more, so age *n* costs 40 + 10 × *n*. In all, the teen years start at 560 XP and adulthood at 1,260. One big rise can pay for more than one age.
- **Decided (Nayed, 2026-11-25):** the weekly reset is no longer a birthday. It still closes the week for condition and neglect.
- **Decided:** the ruler beside the pet shows growth: the progress toward the next age.
- **Decided:** the pet is long-lived. Using the whole weekly limit every week, it reaches adulthood in about 13 weeks, the "about three months" first designed. Lighter use takes longer.
- **Replaced (2026-11-25):** until 0.1.0, each weekly reset was a birthday and the weekly percent was "growth this week." Pets from 0.1.0 keep their age and are credited the usage of the week they were in as XP.
- **Decided:** a drop in the weekly percent is a new week only when the week has ended or Claude reports a later reset time, as after an early reset. Any other drop is a correction and earns no XP.

## Life stages

| Stage | Age | Status |
|---|---|---|
| Egg | Before hatching | Decided |
| Hatching | The moment between egg and baby | Decided |
| Baby | 0 (hatching until it has earned 50 XP) | Proposed, then approved with the baby row |
| Child | 1 to 6 | Proposed |
| Teen | 7 to 11 | Proposed |
| Adult | 12 and up | Proposed |

The age boundaries for child, teen, and adult were Claude's suggestion to match "adulthood at about three months." Nayed approved the rows that show them but was told the exact boundaries are his to set.

## The egg

- **Decided:** a new install starts with an egg.
- **Decided:** warmth is usage since install. The egg hatches after one cookie's worth of usage, which is 10% of a session.
- **Decided:** warmth never drops. If the user stops for a day, the egg waits.
- **Proposed:** the egg shows three states: no cracks (nothing used yet), one small crack (warming), cracked all the way across (about to hatch). It sits still when new, wobbles occasionally while warming, and wobbles fast when about to hatch.
- **Open:** the warmth values at which the first crack and the full crack appear. The mockups use 40% and 90% as samples.
- **Note:** because meals arrive in jumps, the 10% threshold can be crossed between two polls. The egg may go straight from no cracks to hatching. That is acceptable.

## Hatching

- **Decided:** the pet is named at the moment it hatches.
- **Decided:** the name field appears in both the popup and the on-page overlay. Whichever the user sees first does the job.
- **Decided:** the pet stays unnamed until the user names it, and the toolbar icon keeps a `!` badge until then.
- **Decided:** the pet can be renamed later in settings.
- **Proposed:** the hatch plays as three frames: cracked, peeking (the shell splits and two eyes look out), hatched (the baby sits in the bottom half of the shell with the top half on its head). The baby keeps that top half as a hat for the whole baby stage.

## Moods

| Mood | When | Stages |
|---|---|---|
| Happy | Fed in the last few hours | All |
| Eating | The percent just rose | All |
| Hungry | No meal for a while (threshold open) | All |
| Stuffed | Session at 100%. Naps until reset. | All |
| Sulky | Underfed for weeks (threshold open) | Child, teen, adult |
| Ran away | About two empty weeks | Child, teen, adult |

- **Proposed:** the baby has only happy, hungry, stuffed, and eating. Sulky and ran away both need weeks of neglect.
- **Decided (2026-11-25):** babies neither sulk nor run away, even though with XP the baby stage can last more than a week.
- **Proposed:** a hungry baby cries (blue tears, open mouth). Older stages slump and thin out.

## Condition

- **Decided:** the pet's look drifts with recent habits. It does not lock in one form forever.
- **Proposed:** condition is computed from a rolling window of about the last four weeks of weekly fullness. Well-fed weeks keep it sleek. Thin weeks turn it sulky: a grayed, duller color and a scowl. It recovers as the user feeds it again.
- **Open:** the exact window and the thresholds.

## Neglect

- **Decided:** the pet never dies.
- **Decided:** it sulks first, then runs away after about two empty weeks. It leaves a note.
- **Decided:** it comes back the next time the user uses Claude, a little worse for wear, with its age and history intact.
- **Reasoning:** the extension cannot tell neglect from a vacation or an illness, the loss would grow with the pet's age, and "more food is better" already applies pressure.

## Can't reach Claude

- **Decided:** there is a state for when the usage read fails.
- **Proposed:** three causes are shown differently in the popup: signed out of Claude in this browser, offline, and "Claude changed its usage page and the extension cannot read it yet."
- **Proposed:** the pet does not get hungry while it can't see. Time is paused for hunger and neglect during an outage.
- **Proposed:** the popup shows how long ago the pet last saw usage ("last seen 12 min ago" in the mockup).

## Not defined yet

- **Usage credits.** With usage credits turned on, usage continues past 100% of a limit. What a stuffed pet does then is open. The test account had credits off.
- **The Fable weekly limit.** Some plans have a separate weekly limit scoped to one model. **Proposed:** ignore it.
- **Plans with no session limit.** Some accounts have no five-hour limit. Behavior is open.
- **Reset credits.** Claude lets a user reset a limit early. The pet would see the percent drop to zero before the scheduled time. Behavior is open; treating it like a normal reset is the obvious choice.

## Later, not version one

All of these were discussed and set aside on purpose.

- **Retirement.** The user chooses when a pet's life ends. The retired pet goes into an album with its age and traits and leaves an egg that inherits one trait.
- **Generations and a family tree.**
- **Lifetime milestones.** Permanent marks for age in weeks, total full sessions, longest well-fed streak.
- **Adult variants.** The adult form depending on how the pet was cared for. Only one well-fed adult is drawn.
- **What it ate.** The usage response splits the week by product (Claude Code, chats, and so on), so the pet could show what it ate.
