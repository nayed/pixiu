// The pet on the Claude page: a small window that shows no numbers, and a card that opens
// above it on hover, focus, or a click. Built from docs/artboards/*-on-page-overlay.png.
// Like the popup, it renders from the pet's state and a clock and nothing else.

import "@fontsource/jersey-15/400.css";
import "@fontsource/vt323/400.css";
import "./overlay.css";

import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { RULES, type Settings } from "@/lib/pet/config";
import type { PetState } from "@/lib/pet/state";
import { currentWindow, type PetView, type Stage, viewPet } from "@/lib/pet/view";
import {
  BLINK_ROW,
  bodySprite,
  eggSprite,
  HATCHED_BLINK_ROW,
  lostBodySprite,
  sprite,
} from "@/lib/sprites/sprites";
import type { UsageFailureReason } from "@/lib/usage/snapshot";
import { Sprite } from "./Sprite";

/** Screen pixels per sprite pixel in the window. */
const UNIT = 5;
/** A press that moves less than this is a click, not a drag. */
const DRAG_START_PX = 4;
/** How long the card stays after the pointer leaves, so a slip of the hand does not close it. */
const CLOSE_DELAY_MS = 350;

export type OverlayProps = {
  pet: PetState;
  now: Date;
  settings: Settings;
  onName: (name: string) => void;
  onHide: () => void;
  /** While the window is dragged: how far the pointer is from where it took hold. */
  onDrag?: (dx: number, dy: number) => void;
  onDrop?: () => void;
  /** Keeps the card open, for previews. */
  open?: boolean;
};

function place(left: number, top: number) {
  return { left: `${left}px`, top: `${top}px` };
}

export function Overlay(props: OverlayProps) {
  const { pet, now, settings, onDrag, onDrop } = props;
  const view = viewPet(pet, now, settings);
  const unnamed = view.kind === "pet" && view.name === null;

  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const grab = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  useEffect(() => () => clearTimeout(closing.current), []);

  // A pet with no name asks for one without waiting to be hovered.
  const open = props.open || hovered || pinned || unnamed;

  const enter = () => {
    clearTimeout(closing.current);
    setHovered(true);
  };
  const leave = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setHovered(false), CLOSE_DELAY_MS);
  };

  return (
    <div
      class="pixiu-overlay"
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocusIn={enter}
      onFocusOut={leave}
    >
      {open && <Card {...props} view={view} />}
      {/* biome-ignore lint/a11y/useSemanticElements: a button cannot hold the scene's drawings */}
      <div
        class={view.unreachable ? "ov-window ov-gray" : "ov-window"}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${windowLabel(view)}. Shows details. Drag to move.`}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setPinned(!pinned);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          grab.current = { x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const held = grab.current;
          if (!held) return;
          const dx = event.clientX - held.x;
          const dy = event.clientY - held.y;
          if (!held.moved && Math.hypot(dx, dy) < DRAG_START_PX) return;
          held.moved = true;
          onDrag?.(dx, dy);
        }}
        onPointerUp={() => {
          const held = grab.current;
          grab.current = null;
          if (!held) return;
          if (held.moved) onDrop?.();
          else setPinned(!pinned);
        }}
        onPointerCancel={() => {
          if (grab.current?.moved) onDrop?.();
          grab.current = null;
        }}
      >
        <div class="ov-grass" aria-hidden="true" />
        <Actor view={view} pet={pet} />
      </div>
    </div>
  );
}

function windowLabel(view: PetView): string {
  if (view.kind === "egg") return "Your egg";
  const name = view.name ?? "Your pet";
  if (view.kind === "ran-away") return `${name} ran away`;
  return view.unreachable ? `${name}, out of touch with Claude` : `${name}, ${view.mood}`;
}

// The window

/** Teens and adults stand a grid unit taller, so they start higher to stay on the grass. */
function actorTop(stage: Stage): number {
  return stage === "teen" || stage === "adult" ? 0 : 2;
}

/** Where the cookie being eaten sits, in front of the mouth. */
const COOKIE_TOP: Record<Stage, number> = { baby: 50, child: 44, teen: 40, adult: 40 };

const SPARKLES: {
  name: "sparkle-white" | "sparkle-gold";
  left: number;
  top: number;
  pace: string;
}[] = [
  { name: "sparkle-white", left: 8, top: 12, pace: "0.9s" },
  { name: "sparkle-gold", left: 108, top: 8, pace: "1.3s" },
  { name: "sparkle-white", left: 110, top: 44, pace: "0.7s" },
];

function Blink({ row }: { row: number }) {
  return (
    <>
      {[4, 10].map((column) => (
        <div
          key={column}
          class="ov-blink"
          aria-hidden="true"
          style={place(column * UNIT, row * UNIT)}
        />
      ))}
    </>
  );
}

function Actor({ view, pet }: { view: PetView; pet: PetState }) {
  if (view.kind === "egg") {
    const wobble =
      view.unreachable || view.warmth === 0
        ? ""
        : view.crack === "full"
          ? "ov-wobble ov-fast"
          : "ov-wobble";
    return (
      <>
        <div class={`ov-actor ${wobble}`} style={place(24, 2)}>
          <Sprite sprite={eggSprite(view.crack)} scale={UNIT} />
        </div>
        {view.unreachable && <Mark>?</Mark>}
      </>
    );
  }

  if (view.kind === "ran-away") {
    return (
      <div class="ov-actor" style={place(24, 6)}>
        <Sprite sprite={sprite("note-ran-away")} scale={UNIT} />
      </div>
    );
  }

  const { stage, mood } = view;
  if (view.unreachable) {
    // The gray pet stands still.
    return (
      <>
        <div class="ov-actor" style={place(40, actorTop(stage))}>
          <Sprite sprite={lostBodySprite(stage)} scale={UNIT} />
        </div>
        <Mark>?</Mark>
      </>
    );
  }

  if (view.name === null && stage === "baby") {
    return (
      <>
        {SPARKLES.map((sparkle) => (
          <div
            key={sparkle.left}
            class="ov-prop ov-twinkle"
            aria-hidden="true"
            style={{ ...place(sparkle.left, sparkle.top), "--pace": sparkle.pace }}
          >
            <Sprite sprite={sprite(sparkle.name)} scale={2} />
          </div>
        ))}
        <div class="ov-actor ov-hop" style={place(24, 6)}>
          <Sprite sprite={sprite("hatch-hatched")} scale={UNIT} />
          <Blink row={HATCHED_BLINK_ROW} />
        </div>
      </>
    );
  }

  const motion = mood === "stuffed" ? "ov-napping" : mood === "eating" ? "ov-eating" : "";
  const blinks = mood === "happy" || mood === "hungry" || mood === "eating";
  // Something the pet ate before this page was opened is not chewed again.
  const eating = mood === "eating" && pet.lastBite !== null;
  return (
    <>
      <div class={`ov-actor ov-bob ${motion}`} style={place(40, actorTop(stage))}>
        <Sprite sprite={bodySprite(stage, mood)} scale={UNIT} />
        {blinks && <Blink row={BLINK_ROW[stage]} />}
      </div>
      {eating && (
        <div class="ov-prop ov-chomp" aria-hidden="true" style={place(46, COOKIE_TOP[stage])}>
          <Sprite sprite={sprite("cookie-full")} scale={3} />
        </div>
      )}
      {mood === "stuffed" && <Mark>z Z</Mark>}
    </>
  );
}

/** The "z Z" of a nap or the "?" of a pet that can't see, in the window's top left corner. */
function Mark({ children }: { children: ComponentChildren }) {
  return (
    <div class="ov-mark" aria-hidden="true">
      {children}
    </div>
  );
}

// The card

function Segments({ percent, color }: { percent: number; color: string }) {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return (
    <div class="ov-segments" aria-hidden="true" style={{ "--fill": color }}>
      {Array.from({ length: 10 }, (_, index) => (
        <i key={index} class={index < filled ? "ov-on" : undefined} />
      ))}
    </div>
  );
}

const LOST_NOTE: Record<UsageFailureReason, string> = {
  "signed-out": "You are signed out of Claude.",
  offline: "No internet connection.",
  changed: "Pixiu needs an update to read Claude's usage.",
  "not-set-up": "Looking for your account.",
};

function Card(props: OverlayProps & { view: PetView }) {
  const { view, pet, now, onHide, onName } = props;
  const hide = (
    <button type="button" class="ov-button" onClick={onHide}>
      Hide on this page
    </button>
  );
  const lost = view.unreachable && (
    <p class="ov-dim">Can't reach Claude. {LOST_NOTE[view.unreachable]}</p>
  );

  if (view.kind === "egg") {
    const percent = Math.round((view.warmth / RULES.hatchWarmth) * 100);
    const note =
      view.crack === "full"
        ? "Almost there."
        : view.warmth > 0
          ? "Hatches at 100%."
          : "Send a message to warm it.";
    return (
      <section class="ov-card" aria-label="Your egg">
        <Heading title="Egg" detail="Not hatched" />
        <div class="ov-stat">
          <div class="ov-row">
            <span>Warmth</span>
            <span class="ov-food">{percent}%</span>
          </div>
          <Segments percent={percent} color="var(--food)" />
        </div>
        {lost || <p class="ov-dim">{note}</p>}
        {hide}
      </section>
    );
  }

  const name = view.name ?? "Your pet";
  const age = `Age ${view.age}`;

  if (view.kind === "ran-away") {
    return (
      <section class="ov-card" aria-label={name}>
        <Heading title={name} detail={age} />
        <p class="ov-dim">{name} ran away. It comes back the next time you use Claude.</p>
        {lost}
        {hide}
      </section>
    );
  }

  if (view.unreachable) {
    return (
      <section class="ov-card" aria-label={name}>
        <Heading title={name} detail={age} />
        {lost}
        {hide}
      </section>
    );
  }

  if (view.name === null) return <NameCard baby={view.stage === "baby"} onName={onName} />;

  const session = currentWindow(pet.reading?.short, now);
  const week = currentWindow(pet.reading?.long, now);
  const cookies = Math.max(0, Math.min(10, Math.round(session.percent / 10)));
  return (
    <section class="ov-card" aria-label={name}>
      <Heading title={name} detail={age} />
      <div class="ov-stat">
        <div class="ov-row">
          <span>Food</span>
          <span class="ov-food">{Math.round(session.percent)}%</span>
        </div>
        <div class="ov-cookies" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <Sprite
              key={index}
              sprite={sprite(index < cookies ? "cookie-full" : "cookie-empty")}
              scale={2}
            />
          ))}
        </div>
      </div>
      <div class="ov-stat">
        <div class="ov-row">
          <span>Growth</span>
          <span class="ov-growth">{Math.round(week.percent)}%</span>
        </div>
        <Segments percent={week.percent} color="var(--growth)" />
      </div>
      {hide}
    </section>
  );
}

function Heading({ title, detail }: { title: string; detail: string }) {
  return (
    <div class="ov-row">
      <h2>{title}</h2>
      <p class="ov-dim">{detail}</p>
    </div>
  );
}

function NameCard(props: { baby: boolean; onName: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      class="ov-card"
      aria-label="Name your pet"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) props.onName(name);
      }}
    >
      <h2>{props.baby ? "It hatched!" : "Still no name"}</h2>
      <label for="ov-name">Name your pet</label>
      <input
        id="ov-name"
        class="ov-input"
        type="text"
        placeholder="Type a name"
        autocomplete="off"
        maxLength={RULES.maxNameLength}
        required
        value={name}
        onInput={(event) => setName(event.currentTarget.value)}
      />
      <button type="submit" class="ov-button ov-primary">
        Say hello
      </button>
    </form>
  );
}
