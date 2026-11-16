// The pet's drawings. Each sprite is rows of characters plus a palette; "." is transparent.
// sprites.json here is the copy the extension ships. It started as docs/assets/sprites.json.

import type { EggCrack, Mood, Stage } from "../pet/view";
import data from "./sprites.json";

export type Sprite = {
  width: number;
  height: number;
  rows: string[];
  palette: Record<string, string>;
};

export type SpriteName = keyof typeof data.sprites;

const SPRITES: Record<SpriteName, Sprite> = data.sprites;

export function sprite(name: SpriteName): Sprite {
  return SPRITES[name];
}

/** The body color, which the blink paints over the eyes. */
export const BODY_COLOR = "#5cc8a0";

const EGGS: Record<EggCrack, SpriteName> = {
  none: "egg-new",
  small: "egg-warming",
  full: "egg-hatching",
};

export function eggSprite(crack: EggCrack): Sprite {
  return sprite(EGGS[crack]);
}

/** The full creature for the popup and the overlay. */
export function bodySprite(stage: Stage, mood: Mood): Sprite {
  // The baby stage is too short to sulk, so it has no sulky drawing.
  const drawn = stage === "baby" && mood === "sulky" ? "happy" : mood;
  return sprite(`${stage}-body-${drawn}` as SpriteName);
}

// The gray "can't reach Claude" colors from docs/DESIGN.md. Cheeks take the body color, which
// removes them.
const LOST_COLORS = { y: "#c2c4cf", o: "#9a9dab", h: "#dcdde4", p: "#c2c4cf", b: "#dcdde4" };

// The corners of the smile, which come off to leave a neutral mouth: [row, column].
const SMILE_CORNERS: Record<Stage, [number, number][]> = {
  baby: [],
  child: [
    [10, 6],
    [10, 9],
  ],
  teen: [
    [9, 6],
    [9, 9],
  ],
  adult: [
    [9, 6],
    [9, 9],
  ],
};

const lostBodies = new Map<Stage, Sprite>();

/**
 * The gray, still creature shown while usage can't be read. Only the child has a drawn one;
 * the others are made from the happy body by swapping the palette and flattening the mouth.
 */
export function lostBodySprite(stage: Stage): Sprite {
  if (stage === "child") return sprite("child-body-lost");
  const cached = lostBodies.get(stage);
  if (cached) return cached;

  const happy = bodySprite(stage, "happy");
  const rows = happy.rows.map((row) => row.split(""));
  for (const [row, column] of SMILE_CORNERS[stage]) {
    const cells = rows[row];
    if (cells) cells[column] = "y";
  }
  const lost: Sprite = {
    ...happy,
    rows: rows.map((cells) => cells.join("")),
    palette: { ...happy.palette, ...LOST_COLORS },
  };
  lostBodies.set(stage, lost);
  return lost;
}

/** The row of the eyes' top pixels, which the blink covers. Columns 4, 5, 10, and 11. */
export const BLINK_ROW: Record<Stage, number> = { baby: 9, child: 7, teen: 6, adult: 6 };
/** The same for the just-hatched frame. */
export const HATCHED_BLINK_ROW = 7;

type Painter = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect: CanvasRect["fillRect"];
};

/** The face-only drawing for the toolbar icon, where a full body is unreadable. */
export function faceSprite(stage: Stage, mood: Mood): Sprite {
  // No face is drawn eating, and the baby has none sulking. Both fall back to the happy face.
  const drawn = mood === "eating" || (stage === "baby" && mood === "sulky") ? "happy" : mood;
  return sprite(`${stage}-face-${drawn}` as SpriteName);
}

/** The gray face shown while usage can't be read. */
export function lostFaceSprite(stage: Stage): Sprite {
  return sprite(`${stage}-face-lost` as SpriteName);
}

/**
 * Draws a sprite with hard edges, `scale` canvas pixels per cell. In a page, draw at 1 and
 * scale up with CSS; the toolbar icon needs real pixels, so it passes a scale.
 */
export function paint(context: Painter, drawing: Sprite, scale = 1): void {
  drawing.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = drawing.palette[row.charAt(x)];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(x * scale, y * scale, scale, scale);
    }
  });
}
