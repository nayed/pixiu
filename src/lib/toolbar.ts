// Puts the icon, badge, and tooltip on the browser toolbar. Runs in the background worker,
// which has no page, so the sprite is drawn on an offscreen canvas.

import { browser } from "wxt/browser";
import { BADGE_COLORS, BADGE_TEXT_COLOR, HATCH_FRAMES, type ToolbarIcon } from "./icon";
import { paint, type Sprite } from "./sprites/sprites";

/** 16 px for a normal screen, 32 px for a high-density one. */
const SIZES = [16, 32];
const HATCH_FRAME_MS = 800;

function draw(sprite: Sprite): Record<number, ImageData> {
  const images: Record<number, ImageData> = {};
  for (const size of SIZES) {
    const context = new OffscreenCanvas(size, size).getContext("2d");
    if (!context) continue;
    paint(context, sprite, size / sprite.width);
    images[size] = context.getImageData(0, 0, size, size);
  }
  return images;
}

export async function showIcon(icon: ToolbarIcon): Promise<void> {
  await Promise.all([
    browser.action.setIcon({ imageData: draw(icon.sprite) }),
    browser.action.setBadgeText({ text: icon.badge }),
    browser.action.setBadgeBackgroundColor({ color: BADGE_COLORS[icon.tone] }),
    browser.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR }),
    browser.action.setTitle({ title: icon.title }),
  ]);
}

/** Plays the hatch once: cracked, then peeking, then the icon the pet settles on. */
export async function playHatch(settled: ToolbarIcon): Promise<void> {
  await browser.action.setBadgeText({ text: "" });
  for (const frame of HATCH_FRAMES) {
    await browser.action.setIcon({ imageData: draw(frame) });
    await new Promise((resolve) => setTimeout(resolve, HATCH_FRAME_MS));
  }
  await showIcon(settled);
}
