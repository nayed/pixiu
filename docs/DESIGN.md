# Design

All of this is drawn. The images are in `artboards/`, and the drawings themselves are in `assets/`.

## Look

Color pixel art on dark navy panels. Hard edges, no rounded corners, no gradients, no blur. Borders are solid pixel-width lines.

### Colors

| Role | Hex |
|---|---|
| Panel background, sprite outline ("ink") | `#1d1b2e` |
| Raised control background | `#2a2744` |
| Control border | `#6a63a8` |
| Divider, empty bar segment | `#3a3660` |
| Main text | `#f3f1ff` |
| Secondary text | `#b9b4d9` |
| Food (cookies, session number, primary button) | `#ff9a3c`, number text `#ffb366` |
| Growth (XP) | `#4aa8ff` on dark, `#2b6fd0` on the sky, number text `#8cc8ff` |
| Egg warmth fill on the sky | `#e8590c` |
| Scene sky | `#bfe8f2` |
| Scene grass, grass edge | `#7cc96b`, `#4fa354` |
| Pet body, body shade | `#5cc8a0`, `#3a9e7c` |
| Pet belly and chest | `#e3f7ec` |
| Horns | `#f3d98b` |
| Cheeks | `#ff7a90` |
| Sulky body, shade, horns | `#a9b8a6`, `#869784`, `#c9c2a0` |
| Can't-reach body, shade | `#c2c4cf`, `#9a9dab` |
| Can't-reach sky, ground, ground edge | `#d5d9e0`, `#a9b0a6`, `#8b9388` |
| Eggshell, shell shade | `#fff6dc`, `#e6d3a3` |

Food is orange and growth is blue everywhere. The two also differ in lightness, so they stay distinguishable without color.

### Type

- **Jersey 15** for headings and numbers. The mockups use Pixelify Sans, which was replaced during the build because its capital C reads as an O ("Crixus" looked like "Orixus").
- **VT323** for body text, at 20 px or larger.

Both are on Google Fonts under the Open Font License. The extension bundles them from the Fontsource packages and does not load them from the network.

## Sprites

Every drawing sits on a 16 x 16 grid, except the cookie (8 x 8) and the sparkle (5 x 5). The grid is the unit for everything: sizes, positions, and animation steps.

- `assets/sprites.json` holds each sprite as rows of characters plus a palette. `.` is transparent.
- `assets/sprites/*.png` holds the same sprites at 1x with transparency. Scale them with nearest-neighbor only (`image-rendering: pixelated` in CSS).

| Use | Scale | Size |
|---|---|---|
| Popup scene | 8x | 128 px |
| On-page overlay | 5x | 80 px |
| Toolbar icon | 1x | 16 px (Chrome also wants 32, 48, 128) |
| Popup cookies | 3x | 24 px |

### Naming

`{stage}-body-{mood}` is the full creature, used in the popup and overlay. `{stage}-face-{mood}` is the face-only drawing, used for the toolbar icon. A full body is unreadable at 16 px, which is why the icon has its own drawings with larger features.

| Sprites | Notes |
|---|---|
| `egg-new`, `egg-warming`, `egg-hatching` | The egg with no cracks, one crack, cracked across. Also the toolbar icon before hatching. |
| `hatch-peeking`, `hatch-hatched` | The hatch frames. The first frame of the hatch is `egg-hatching`. |
| `baby-body-*`, `baby-face-*` | happy, hungry, stuffed, eating (body only), lost (face only) |
| `child-*`, `teen-*`, `adult-*` | happy, hungry, stuffed, sulky, eating (body only), lost |
| `note-ran-away` | The note left behind. Replaces the pet and the icon when it has run away. |
| `cookie-full`, `cookie-empty` | Food meter pieces. `cookie-full` is also the cookie being eaten. |
| `sparkle-white`, `sparkle-gold` | Hatching sparkles. |

Only `child-body-lost` exists as a gray body. The other stages need a gray body made by swapping the palette (body, shade, and horn colors from the table above, cheeks removed, neutral mouth).

### How the stages differ

- **Baby:** small and round, no horns, wearing the top of its eggshell as a hat.
- **Child:** wider, with two short stubby horns.
- **Teen:** taller and narrower, on two legs, longer horns, a tuft of hair.
- **Adult:** the broadest form, large horns that sweep outward, a pale chest patch.

### How the moods differ

Moods change posture and silhouette, not only the mouth, so they read at small sizes.

- **Hungry:** lower head, shorter horns, thinner body, frown. The baby cries blue tears.
- **Stuffed:** eyes closed, a pale round belly that widens the outline.
- **Sulky:** one horn worn down to a stub, heavy brows, flat mouth, grayed color.
- **Eating:** open mouth.

## Animations

All motion moves in whole grid units with hard steps. Nothing eases. Everything stops under `prefers-reduced-motion`.

| Animation | What moves | Timing |
|---|---|---|
| Idle bob | Pet shifts down one grid unit and back | 1 s loop, two frames |
| Napping | Same bob, slower | 2.4 s loop |
| Eating | Same bob, faster, with the open-mouth sprite | 0.4 s loop |
| Cookie being eaten | Whole, then the half nearest the mouth gone, then gone | Three steps over 1.2 s |
| Blink | The top eye pixels are painted body color for a moment | Once every 4 s |
| Egg wobble | Egg shifts one unit left, right, left, then rests | 2.4 s loop warming, 0.8 s when about to hatch |
| Hatch hop | Pet jumps two units up, one, then lands | 1.6 s loop |
| Sparkles | Each twinkles between full and faint | 0.7 to 1.3 s, staggered |

Blink positions (0-indexed, columns 4, 5, 10, 11): row 9 for the baby, row 7 for the child and the hatched frame, row 6 for the teen and adult. The gray "can't reach" pet does not move.

The cookie sits directly in front of the mouth, overlapping the cheek. An earlier version placed it beside the pet and it read as vanishing, not being eaten.

## Surfaces

### Popup (360 x 520)

See `artboards/*-popup.png`. Top to bottom:

1. The pet's name and age, with a settings button.
2. The scene: sky, grass, the pet at 8x, and the growth ruler with the percent of the way to the next age.
3. "Food this session" with the percent, ten cookies, and one line saying what is happening or what to do.
4. "Growth to age 2" with the XP earned toward it and what it costs, for example "34 / 60 XP". It replaced "Growth this week" with the time until the next birthday when aging moved to XP.
5. A switch to show or hide the pet on the Claude page.

Variants: the egg (warmth thermometer in place of the ruler, no cookies), hatching (name field and a "Say hello" button), and can't reach Claude (gray scene, a reason, and an "Open Claude" button when signed out).

Keep the text short. An earlier version had a status sentence that repeated what the face already showed, and it was removed.

### Toolbar icon

See `artboards/*-toolbar-icon.png`. The icon is the face sprite for the pet's stage and mood. The badge carries one short piece of text.

| State | Badge |
|---|---|
| Happy, sulky | The session percent, for example `62` |
| Hungry | `!` |
| Stuffed | `zz` |
| Hatched, not named yet | `!` |
| Can't reach Claude | `?` |
| Ran away, egg | None |

The badge text is **Proposed**. The dark outline disappears on dark toolbars, but the body color carries the shape. Check the icons on both light and dark themes.

### On-page overlay (later than version one)

See `artboards/*-on-page-overlay.png`. The gray page in those images is a placeholder, not Claude's real layout.

- The pet lives in a small sky-and-grass window (128 x 96) in the bottom-right corner of claude.ai, with a light-and-dark double border so it shows on both themes.
- It reacts live: it eats when the percent rises and naps at the limit.
- It shows no numbers by default. Hovering opens a card with cookies, a growth bar with the XP toward the next age, and a "Hide on this page" button.
- It must be draggable and hideable, because it sits over a page people work in.

## One state, three faces

Keep the pet's state in the background worker and have every surface render from it, so the popup, icon, and overlay can never disagree.

## Accessibility notes from the mockups

- Controls are real buttons, links, inputs, and labels, at least 44 px tall.
- Sprites carry a text description. Decorative pieces are hidden from screen readers.
- Text colors were chosen to pass 4.5:1 contrast on their backgrounds.
