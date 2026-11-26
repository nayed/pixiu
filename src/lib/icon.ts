// What the toolbar icon shows: a face for the pet's stage and mood, and one short badge.
// Pure, so the popup's debug page and the background worker agree by construction.

import { describeView } from "./pet/describe";
import type { PetState } from "./pet/state";
import { currentWindow, type PetView } from "./pet/view";
import { eggSprite, faceSprite, lostFaceSprite, type Sprite, sprite } from "./sprites/sprites";

export type BadgeTone = "food" | "lost";

export type ToolbarIcon = {
  sprite: Sprite;
  /** At most three characters, or empty for no badge. */
  badge: string;
  /** Orange for food and attention, gray for "can't reach Claude". */
  tone: BadgeTone;
  /** The tooltip. */
  title: string;
};

export const BADGE_COLORS: Record<BadgeTone, string> = { food: "#ff9a3c", lost: "#c2c4cf" };
export const BADGE_TEXT_COLOR = "#1d1b2e";

export function toolbarIcon(view: PetView, pet: PetState, now: Date): ToolbarIcon {
  const title = `Pixiu: ${describeTitle(view)}`;
  const icon = (drawing: Sprite, badge = "", tone: BadgeTone = "food"): ToolbarIcon => ({
    sprite: drawing,
    badge,
    tone,
    title,
  });

  if (view.kind === "egg") {
    const egg = eggSprite(view.crack);
    // Before the account is found, the user has something to do: open Claude once.
    if (view.unreachable === "not-set-up") return icon(egg, "!");
    return view.unreachable ? icon(egg, "?", "lost") : icon(egg);
  }

  if (view.kind === "ran-away") {
    const note = sprite("note-ran-away");
    return view.unreachable ? icon(note, "?", "lost") : icon(note);
  }

  if (view.unreachable) return icon(lostFaceSprite(view.stage), "?", "lost");

  // Hatched but not named yet: the badge stays until the user names it.
  if (view.name === null) {
    const waiting =
      view.stage === "baby" ? sprite("hatch-hatched") : faceSprite(view.stage, "happy");
    return icon(waiting, "!");
  }

  const face = faceSprite(view.stage, view.mood);
  if (view.mood === "hungry") return icon(face, "!");
  if (view.mood === "stuffed") return icon(face, "zz");
  const session = currentWindow(pet.reading?.short, now);
  return icon(face, String(Math.round(session.percent)));
}

function describeTitle(view: PetView): string {
  if (view.unreachable === "not-set-up") return "open Claude once to get started";
  if (view.unreachable) return "can't reach Claude";
  if (view.kind === "egg") return "an egg, not hatched yet";
  if (view.kind === "pet" && view.name === null) return "it hatched and needs a name";
  if (view.kind === "pet" && view.celebrating) return `${describeView(view)}. Birthday today!`;
  return describeView(view);
}

/** The frames the icon plays once at the moment of hatching, before it settles. */
export const HATCH_FRAMES: Sprite[] = [sprite("egg-hatching"), sprite("hatch-peeking")];
