// Plain-text descriptions of the pet, for the log, the bare popup, and the debug page.

import { RULES } from "./config";
import type { PetEvent } from "./engine";
import type { PetView } from "./view";

export function describeEvent(event: PetEvent): string {
  switch (event.type) {
    case "ate":
      return event.points > 0 ? `Ate ${event.points}% of a session` : "Ate a little";
    case "hatched":
      return "Hatched";
    case "birthday":
      return `Birthday: now age ${event.age}`;
    case "ran-away":
      return "Ran away";
    case "came-back":
      return "Came back";
  }
}

export function describeView(view: PetView): string {
  const blind = view.unreachable ? ` (can't reach Claude: ${view.unreachable})` : "";
  if (view.kind === "egg") {
    return `Egg, warmth ${view.warmth} of ${RULES.hatchWarmth}, crack: ${view.crack}${blind}`;
  }
  const who = `${view.name ?? "Unnamed"}, ${view.stage}, age ${view.age}`;
  return view.kind === "ran-away" ? `${who}, ran away${blind}` : `${who}, ${view.mood}${blind}`;
}
