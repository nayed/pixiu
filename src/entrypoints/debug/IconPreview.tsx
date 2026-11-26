// The toolbar icon for the pretend pet, on a light and a dark toolbar.

import type { ToolbarIcon } from "@/lib/icon";
import { ToolbarIconImage } from "@/ui/ToolbarIconImage";

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
          <ToolbarIconImage icon={icon} scale={1} />
          <ToolbarIconImage icon={icon} scale={3} />
        </div>
      ))}
      <p class="preview-note">Tooltip: {icon.title}</p>
    </section>
  );
}
