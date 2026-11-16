// The toolbar icon for the pretend pet, on a light and a dark toolbar. The badge here is an
// imitation: the browser draws the real one, in its own shape and font.

import { BADGE_COLORS, BADGE_TEXT_COLOR, type ToolbarIcon } from "@/lib/icon";
import { Sprite } from "@/ui/Sprite";

function Icon({ icon, scale }: { icon: ToolbarIcon; scale: number }) {
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

export function IconPreview({ icon }: { icon: ToolbarIcon }) {
  return (
    <section
      class="icon-preview"
      role="img"
      aria-label={`Toolbar icon. ${icon.title}. Badge: ${icon.badge || "none"}`}
    >
      {(["light", "dark"] as const).map((theme) => (
        <div key={theme} class={`toolbar toolbar-${theme}`}>
          <span>{theme === "light" ? "Light toolbar" : "Dark toolbar"}</span>
          <Icon icon={icon} scale={1} />
          <Icon icon={icon} scale={3} />
        </div>
      ))}
      <p class="preview-note">Tooltip: {icon.title}</p>
    </section>
  );
}
