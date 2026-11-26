// The artboards: every surface of the extension in a fixed state, one board per page, drawn by
// the real components. `pnpm artboards` captures them into docs/artboards. Opened with no board
// named, the page lists them all.

import "@fontsource/jersey-15/400.css";
import "@fontsource/vt323/400.css";
import "./style.css";

import { type ComponentChildren, render } from "preact";
import { HATCH_FRAMES, type ToolbarIcon, toolbarIcon } from "@/lib/icon";
import type { PetState } from "@/lib/pet/state";
import { viewPet } from "@/lib/pet/view";
import { Overlay } from "@/ui/Overlay";
import { PetPopup } from "@/ui/PetPopup";
import { Sprite } from "@/ui/Sprite";
import { ToolbarIconImage } from "@/ui/ToolbarIconImage";
import boards from "./boards.json";
import { egg, NOW, pet, SETTINGS, STAGES } from "./pets";

const nothing = () => {};

const iconOf = (state: PetState): ToolbarIcon =>
  toolbarIcon(viewPet(state, NOW, SETTINGS), state, NOW);

// Surfaces

function Popup({ pet: state }: { pet: PetState }) {
  return (
    <PetPopup
      pet={state}
      now={NOW}
      settings={SETTINGS}
      onName={nothing}
      onSaveSettings={nothing}
      overlayShown
      onShowOverlay={nothing}
    />
  );
}

/** A stand-in for claude.ai, with the overlay where it sits by default: the bottom right. */
function ClaudePage({ pet: state }: { pet: PetState }) {
  return (
    <div class="claude-page">
      <div class="claude-sidebar" aria-hidden="true">
        <i style={{ width: "120px", height: "20px" }} />
        <i style={{ width: "170px", marginTop: "16px" }} />
        <i style={{ width: "140px" }} />
        <i style={{ width: "160px" }} />
        <i style={{ width: "110px" }} />
        <i style={{ width: "150px" }} />
      </div>
      <div class="claude-chat">
        <p>Claude page (gray placeholder, not the real layout)</p>
        <i class="claude-mine" style={{ width: "300px", height: "56px" }} />
        <i class="claude-reply" style={{ width: "440px", height: "132px" }} />
        <i class="claude-mine" style={{ width: "220px", height: "40px" }} />
        <i class="claude-reply" style={{ width: "400px", height: "96px" }} />
        <div class="claude-box">Message box (placeholder)</div>
      </div>
      <div class="claude-overlay">
        <Overlay pet={state} now={NOW} settings={SETTINGS} onName={nothing} onHide={nothing} open />
      </div>
    </div>
  );
}

type SheetItem = { name: string; note: string; icon: ToolbarIcon };

/** A toolbar icon sheet: the faces up close, what each means, and each at actual size. */
function IconSheet(props: { title: string; subtitle: string; gray?: boolean; items: SheetItem[] }) {
  const { title, subtitle, gray, items } = props;
  return (
    <div class="sheet">
      <h1>{title}</h1>
      <p class="sheet-subtitle">{subtitle}</p>
      <div class={gray ? "sheet-band sheet-gray" : "sheet-band"}>
        {items.map((item) => (
          <div class="sheet-face" key={item.name}>
            <Sprite sprite={item.icon.sprite} scale={6} label={item.name} />
          </div>
        ))}
      </div>
      <div class="sheet-captions">
        {items.map((item) => (
          <div class="sheet-caption" key={item.name}>
            <h2>{item.name}</h2>
            <p class="sheet-note">{item.note}</p>
            <p class="sheet-badge">{item.icon.badge ? `Badge: ${item.icon.badge}` : "No badge"}</p>
          </div>
        ))}
      </div>
      <div class="sheet-toolbars">
        {(["light", "dark"] as const).map((theme) => (
          <div class={`sheet-toolbar sheet-${theme}`} key={theme}>
            <span>{theme === "light" ? "Light" : "Dark"} toolbar, actual size</span>
            {items.map((item) => (
              <ToolbarIconImage key={item.name} icon={item.icon} scale={1} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The five faces of a stage that can sulk and run away. */
function moodItems(stage: { age: number; xp: number; week: number }): SheetItem[] {
  return [
    { name: "Happy", note: "Fed in the last 6 waking hours", icon: iconOf(pet(stage)) },
    {
      name: "Hungry",
      note: "No meal for 6 waking hours",
      icon: iconOf(pet({ ...stage, mood: "hungry" })),
    },
    {
      name: "Stuffed",
      note: "Session limit reached",
      icon: iconOf(pet({ ...stage, mood: "stuffed" })),
    },
    {
      name: "Sulky",
      note: "Underfed for weeks",
      // A thin current week too, or a good one would lift the pet out of its sulk.
      icon: iconOf(pet({ ...stage, mood: "sulky", session: 20, week: 15 })),
    },
    {
      name: "Ran away",
      note: "Back when you use Claude",
      icon: iconOf(pet({ ...stage, ranAway: true })),
    },
  ];
}

// The boards

const BOARDS: Record<string, () => ComponentChildren> = {
  "first-run-popup": () => <Popup pet={egg(0, "not-set-up")} />,
  "egg-popup": () => <Popup pet={egg(4)} />,
  "egg-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: egg"
      subtitle="Before hatching, the icon is the egg. The cracks show how close it is."
      items={[
        { name: "New egg", note: "Nothing eaten yet", icon: iconOf(egg(0)) },
        { name: "Warming", note: "First crack at 40% warmth", icon: iconOf(egg(4)) },
        { name: "About to hatch", note: "Cracked across at 90%", icon: iconOf(egg(9)) },
      ]}
    />
  ),
  "egg-on-page-overlay": () => <ClaudePage pet={egg(4)} />,

  "hatching-popup": () => <Popup pet={pet({ ...STAGES.baby, xp: 0, name: null })} />,
  "hatching-toolbar-icon": () => {
    const hatched = iconOf(pet({ ...STAGES.baby, xp: 0, name: null }));
    const frame = (sprite: ToolbarIcon["sprite"]): ToolbarIcon => ({
      ...hatched,
      sprite,
      badge: "",
    });
    return (
      <IconSheet
        title="Toolbar icon: hatching"
        subtitle="The icon plays these three frames once, then keeps a ! badge until the pet has a name."
        items={[
          {
            name: "1. Cracked",
            note: "Warmth reaches 100%",
            icon: frame(HATCH_FRAMES[0] ?? hatched.sprite),
          },
          {
            name: "2. Peeking",
            note: "The shell splits open",
            icon: frame(HATCH_FRAMES[1] ?? hatched.sprite),
          },
          { name: "3. Hatched", note: "Waiting for a name", icon: hatched },
        ]}
      />
    );
  },
  "hatching-on-page-overlay": () => <ClaudePage pet={pet({ ...STAGES.baby, xp: 0, name: null })} />,

  "baby-popup": () => <Popup pet={pet(STAGES.baby)} />,
  "baby-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: baby"
      subtitle="The baby's face, still wearing a piece of eggshell. No horns yet."
      items={moodItems(STAGES.baby).slice(0, 3)}
    />
  ),
  "baby-on-page-overlay": () => <ClaudePage pet={pet({ ...STAGES.baby, mood: "eating" })} />,

  "child-popup": () => <Popup pet={pet(STAGES.child)} />,
  "child-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: child"
      subtitle="Face only, with larger features, so each mood still reads at 16 pixels."
      items={moodItems(STAGES.child)}
    />
  ),
  "child-on-page-overlay": () => <ClaudePage pet={pet({ ...STAGES.child, mood: "eating" })} />,

  "teen-popup": () => <Popup pet={pet(STAGES.teen)} />,
  "teen-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: teen"
      subtitle="Taller, with long horns and a tuft of hair."
      items={moodItems(STAGES.teen)}
    />
  ),
  "teen-on-page-overlay": () => <ClaudePage pet={pet({ ...STAGES.teen, mood: "eating" })} />,

  "adult-popup": () => <Popup pet={pet(STAGES.adult)} />,
  "adult-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: adult"
      subtitle="The broadest face, with big curved horns."
      items={moodItems(STAGES.adult)}
    />
  ),
  "adult-on-page-overlay": () => <ClaudePage pet={pet({ ...STAGES.adult, mood: "eating" })} />,

  "ran-away-popup": () => <Popup pet={pet({ ...STAGES.child, ranAway: true })} />,

  "cant-reach-claude-popup": () => (
    <Popup pet={pet({ ...STAGES.child, blind: "signed-out", seenMinutesAgo: 12 })} />
  ),
  "cant-reach-claude-toolbar-icon": () => (
    <IconSheet
      title="Toolbar icon: can't reach Claude"
      subtitle="Whatever stage the pet is at, its face turns gray with a neutral mouth and a ? badge."
      gray
      items={(["baby", "child", "teen", "adult"] as const).map((stage) => ({
        name: stage[0]?.toUpperCase() + stage.slice(1),
        note: "",
        icon: iconOf(pet({ ...STAGES[stage], blind: "signed-out" })),
      }))}
    />
  ),
  "cant-reach-claude-on-page-overlay": () => (
    <ClaudePage pet={pet({ ...STAGES.child, blind: "signed-out", seenMinutesAgo: 12 })} />
  ),
};

function Index() {
  return (
    <main class="index">
      <h1>Pixiu artboards</h1>
      <p>Each board is the real extension in a fixed state. `pnpm artboards` captures them.</p>
      <ul>
        {boards.map((board) => (
          <li key={board.name}>
            <a href={`?board=${board.name}`}>{board.name}</a> ({board.kind})
          </li>
        ))}
      </ul>
    </main>
  );
}

const name = new URLSearchParams(location.search).get("board");
const board = name ? BOARDS[name] : undefined;
const root = document.getElementById("app");
if (root) {
  document.title = name ?? "Pixiu artboards";
  document.body.className = board ? `board board-${boards.find((b) => b.name === name)?.kind}` : "";
  render(board ? board() : <Index />, root);
}
