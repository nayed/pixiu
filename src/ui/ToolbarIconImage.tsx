// The toolbar icon as a picture: the sprite, with the badge drawn on top. The badge here is an
// imitation: the browser draws the real one, in its own shape and font.

import "./toolbar-icon.css";
import { BADGE_COLORS, BADGE_TEXT_COLOR, type ToolbarIcon } from "@/lib/icon";
import { Sprite } from "./Sprite";

export function ToolbarIconImage({ icon, scale }: { icon: ToolbarIcon; scale: number }) {
  return (
    <span class="toolbar-icon" style={{ "--scale": scale }}>
      <Sprite sprite={icon.sprite} scale={scale} />
      {icon.badge && (
        <span
          class="toolbar-badge"
          style={{ background: BADGE_COLORS[icon.tone], color: BADGE_TEXT_COLOR }}
        >
          {icon.badge}
        </span>
      )}
    </span>
  );
}
