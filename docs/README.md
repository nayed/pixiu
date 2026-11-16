# Pixiu docs

Pixiu is a Chrome extension that shows your Claude plan usage as a Tamagotchi-style virtual pet. Using Claude feeds the pet. The more you feed it, the better it does.

This folder is the handoff from the design conversation to implementation. Nothing has been built yet except a throwaway test extension that proved the data source.

## Read in this order

1. [BRIEF.md](BRIEF.md): what Pixiu is, why it works the way it does, and every decision made so far.
2. [RULES.md](RULES.md): the pet's rules, written precisely enough to implement.
3. [DATA.md](DATA.md): where the usage numbers come from and what the test proved.
4. [DESIGN.md](DESIGN.md): the visual system, the surfaces, the sprites, and the animations.
5. [MVP.md](MVP.md): what version one includes, what waits, and the open questions.
6. [PLAN.md](PLAN.md): a suggested build order.

## What else is here

| Path | What it holds |
|---|---|
| `artboards/*.png` | Exported images of every design artboard (20 images), at 2x. |
| `artboards/source/` | The design canvas sources (`.dc.html`) and its layout file. Reference only; the sprite data inside them is already extracted into `assets/`. |
| `assets/sprites/*.png` | Every sprite as a pixel-exact PNG at 1x (16 x 16, transparent), ready to use. |
| `assets/sprites.json` | The same sprites as character grids plus palettes. This is the source of truth for the drawings. |
| `assets/icons/` | Extension icons at 16, 32, 48, and 128 px (the happy child face). |
| `assets/sprite-sheet-preview.png` | All sprites on one sheet, for a quick look. |
| `reference/data-test-extension/` | The throwaway extension used to test the data source. Working code for finding the organization ID and reading usage. |

## How to read the status of a statement

The docs mark each rule with one of these, because not everything was decided with the same firmness:

- **Decided**: Nayed chose it or explicitly agreed to it.
- **Proposed**: Claude suggested it during design and it was not objected to, but it was never explicitly confirmed. Safe to build, cheap to change.
- **Open**: nobody has decided. Ask before building.

## First prompt for Claude Code

> Read everything in `/docs`, starting with `docs/README.md` and following its reading order. Then summarize the version-one scope back to me, list the open questions from `docs/MVP.md` that block the first milestone, and propose a tech stack before writing any code.

## Conventions

- American English spelling in code, comments, and docs.
- "Mochi" is a sample pet name used in the mockups. The user names their own pet.
- "Token Pet" was the working title. The project is named Pixiu.
