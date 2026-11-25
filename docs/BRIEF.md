# Brief

## The idea

Pixiu is a Chrome extension that turns your Claude plan usage into a virtual pet, in the spirit of the original Tamagotchi. Claude's usage page shows two progress bars. Pixiu shows a creature that eats, grows, sulks, and naps according to the same numbers.

The link between the two ideas: both are meters running on a clock. A Tamagotchi's stats drain over time and get refilled by care. Plan usage fills as you work and resets on a schedule.

## The name

A pixiu is a creature from Chinese legend that eats gold and silver and never lets any of it out, which is why it stands for gathering wealth. It only takes in, and more is better. That is this pet. It is also a guardian and a lucky charm, so the tone is friendly.

Names considered and rejected: Taotie (a gluttony monster, but a warning figure, which fights the "feeding is good" message) and Tantalus (food forever out of reach, the opposite of the idea).

To check before publishing: there may be an existing open-source finance AI project called PIXIU. Search the name on the Chrome Web Store and GitHub first.

## The core choices

These were decided by Nayed during the design conversation.

- **Tokens are food, and more is better.** This is the classic Tamagotchi model. The pet is a mascot for getting your money's worth from the plan. It is not a budget warning.
- **Claude plan limits first.** Other providers (OpenAI, Cursor) are a hypothetical later addition. If that happens, those providers' own models would write their adapters. See "Other providers" below.
- **A long-lived pet.** A pet that lives one week was rejected as too quick. One pet lives for months.
- **No death.** At worst the pet runs away, and it comes back. See RULES.md.
- **Three surfaces.** A popup, a toolbar icon whose face changes, and a small companion drawn on the Claude page. All three are designed. Version one ships the first two (see MVP.md).
- **Color pixel art.** Not the monochrome look of the original toy.
- **Jade green with gold horns.** The first drawings were yellow with pointed ears and read too close to Pikachu, especially next to the name. The pet was recolored jade (a pixiu is often carved in jade) and the ears became horns.

## How the original Tamagotchi informs this

- The original ran in real time and beeped for attention. Pixiu runs on real usage and never nags.
- The original's adult form depended on "care mistakes." Pixiu judges care on the weekly bar (see RULES.md).
- The original wiped everything at death. That was tolerable for a pet that lived three weeks and would not be for one that lives three months, which is why Pixiu has no death.
- Later Tamagotchi models added generations: an adult left an egg behind. Pixiu keeps that idea for later, as voluntary retirement.

## The two meters

Claude paid plans have a five-hour session limit and a weekly limit. Each maps to one pet stat.

| Claude | Pet | Shown as |
|---|---|---|
| Session percent used | The current meal: how full the pet is right now | Ten cookies that fill in |
| Weekly percent used | Growth: each point is 1 XP toward the next age | A height ruler beside the pet |
| Weekly reset | The end of a week, for condition and neglect | Nothing on screen |

The pet's age follows usage, not the calendar: each age costs a little more XP than the one before. Until 0.1.0, each weekly reset was a birthday and one week was one year; see RULES.md.

## What the data test changed

A test extension was run before any implementation (see DATA.md). It proved the numbers can be read from the background with no Claude tab open. It also changed one rule.

A sample showed that 22% of a session moved the week by 4 points. On a Pro plan, a full session is then worth roughly 18% of the week, so about five and a half full sessions fill the weekly bar. A week has more than thirty possible sessions. The earlier rule, "a session that closes barely fed is a care mistake," would have punished even a perfect user constantly.

**Decided:** care is judged on the weekly bar. The session bar is only the current meal, with no penalty for a light session.

## Other providers

**Decided:** not in scope now, and it may never happen. If it does, another provider's model would write its own adapter.

**Proposed:** to keep that door open, the pet logic should consume one small normalized shape and nothing Claude-specific: a short window and a long window, each with a percent used and a reset time. The Claude adapter produces that shape. See DATA.md.

## Things nobody has decided

See the "Open questions" section of MVP.md. The largest ones are the tech stack, the thresholds for hunger and sulking, and whether the extension will be published.
