// The pet popup. It renders from the pet's state and a clock and nothing else, so the real
// popup and the debug page (with its pretend clock) show exactly the same thing.

import "@fontsource/pixelify-sans/600.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/vt323/400.css";
import "./pet-popup.css";

import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { agoText, timeLeftText } from "@/lib/format";
import { RULES, type Settings } from "@/lib/pet/config";
import type { PetState } from "@/lib/pet/state";
import {
  currentWindow,
  type EggCrack,
  type Mood,
  type PetView,
  type Stage,
  thinWeeks,
  viewPet,
} from "@/lib/pet/view";
import {
  BLINK_ROW,
  bodySprite,
  eggSprite,
  HATCHED_BLINK_ROW,
  lostBodySprite,
  type Sprite as SpriteData,
  sprite,
} from "@/lib/sprites/sprites";
import type { UsageFailureReason, UsageWindow } from "@/lib/usage/snapshot";
import { SettingsPanel } from "./SettingsPanel";
import { Sprite } from "./Sprite";

const CLAUDE_URL = "https://claude.ai/";
const UNIT = 8;

export type PetPopupProps = {
  pet: PetState;
  now: Date;
  settings: Settings;
  onName: (name: string) => void;
  onSaveSettings: (settings: Settings) => void;
  /** Where the debug page lives, if there is one to link to. */
  debugUrl?: string;
};

/** The scene's height inside its border when nothing squeezes it. */
const SCENE_HEIGHT = 212;

/** An absolute position inside the scene, in screen pixels from its top left. */
function place(left: number, top: number) {
  return { left: `${left}px`, top: `${top}px` };
}

/**
 * The same position for something that stands on the grass: `top` is where it sits in a
 * full-height scene, and it stays on the ground if the scene gets shorter.
 */
function stand(left: number, top: number, height = 16 * UNIT) {
  return { left: `${left}px`, bottom: `${SCENE_HEIGHT - top - height}px` };
}

type Body = { title: string; detail?: string; content: ComponentChildren };

export function PetPopup(props: PetPopupProps) {
  const { pet, now, settings } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const view = viewPet(pet, now, settings);
  const hatchFrame = useHatchFrame(view.kind === "pet" && view.name === null && view.age === 0);

  const body: Body = settingsOpen
    ? {
        title: "Settings",
        content: <SettingsPanel {...props} onDone={() => setSettingsOpen(false)} />,
      }
    : bodyFor(view, props, hatchFrame);

  return (
    <div class="pixiu">
      <div class="px-head">
        <div class="px-title">
          <h1>{body.title}</h1>
          {body.detail && <p class="px-dim">{body.detail}</p>}
        </div>
        <button
          type="button"
          class="px-icon-button"
          aria-label={settingsOpen ? "Close settings" : "Settings"}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          {settingsOpen ? <CloseIcon /> : <SettingsIcon />}
        </button>
      </div>
      {body.content}
    </div>
  );
}

function bodyFor(view: PetView, props: PetPopupProps, hatchFrame: HatchFrame): Body {
  const { pet, now } = props;
  const age = `Age ${pet.age}`;

  if (view.kind === "egg") {
    const title = "Egg";
    const detail = "Not hatched yet";
    if (view.unreachable === "not-set-up") return { title, detail, content: <FirstRun /> };
    if (view.unreachable) {
      const scene = <StillActor sprite={eggSprite(view.crack)} label="A speckled egg, in gray" />;
      return {
        title,
        detail,
        content: <Lost {...props} reason={view.unreachable} scene={scene} />,
      };
    }
    return { title, detail, content: <Egg warmth={view.warmth} crack={view.crack} /> };
  }

  const name = view.name ?? "Your pet";
  if (view.unreachable) {
    const still =
      view.kind === "ran-away" ? (
        <StillActor sprite={sprite("note-ran-away")} label="A note left on the ground" top={64} />
      ) : (
        <StillActor
          sprite={lostBodySprite(view.stage)}
          label={`${name} in gray, standing still with a question mark above its head`}
          top={actorTop(view.stage)}
        />
      );
    return {
      title: name,
      detail: age,
      content: <Lost {...props} reason={view.unreachable} scene={still} />,
    };
  }

  if (view.kind === "ran-away")
    return { title: name, detail: age, content: <RanAway name={name} /> };

  if (view.name === null) {
    return {
      // Short enough to stay on one line, so the layout does not jump between frames.
      title: hatchFrame === "hatched" ? "It hatched!" : "It's hatching!",
      content: <Hatching {...props} stage={view.stage} frame={hatchFrame} />,
    };
  }
  return {
    title: view.name,
    detail: age,
    content: <Pet pet={pet} now={now} name={view.name} stage={view.stage} mood={view.mood} />,
  };
}

// The scene

function Scene(props: { gray?: boolean; clouds?: boolean; children: ComponentChildren }) {
  return (
    <div class={props.gray ? "px-scene px-gray" : "px-scene"}>
      {props.clouds && (
        <>
          <div class="px-cloud" aria-hidden="true" style={{ ...place(20, 20), width: "48px" }} />
          <div class="px-cloud" aria-hidden="true" style={{ ...place(28, 12), width: "24px" }} />
        </>
      )}
      <div class="px-grass" aria-hidden="true" />
      {props.children}
    </div>
  );
}

/** Teens and adults stand a grid unit taller, so they start a unit higher to stay on the grass. */
function actorTop(stage: Stage): number {
  return stage === "teen" || stage === "adult" ? 48 : 56;
}

function StillActor(props: { sprite: SpriteData; label: string; top?: number }) {
  return (
    <div class="px-actor" style={stand(96, props.top ?? 56)}>
      <Sprite sprite={props.sprite} scale={UNIT} label={props.label} />
    </div>
  );
}

/** Two patches of body color over the top of the eyes, shown for a moment every few seconds. */
function Blink({ row }: { row: number }) {
  return (
    <>
      {[4, 10].map((column) => (
        <div
          key={column}
          class="px-blink"
          aria-hidden="true"
          style={place(column * UNIT, row * UNIT)}
        />
      ))}
    </>
  );
}

function Meter(props: { percent: number; color: string; label: string }) {
  const filled = Math.max(0, Math.min(10, Math.round(props.percent / 10)));
  return (
    <div class="px-meter" role="img" aria-label={props.label}>
      <span>{Math.round(props.percent)}%</span>
      <div class="px-meter-bar" style={{ "--fill": props.color }}>
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} class={index < filled ? "px-on" : undefined} />
        ))}
      </div>
    </div>
  );
}

// The egg

function Egg(props: { warmth: number; crack: EggCrack }) {
  const { warmth, crack } = props;
  const percent = Math.round((warmth / RULES.hatchWarmth) * 100);
  const wobble = crack === "full" ? "px-wobble px-fast" : warmth > 0 ? "px-wobble" : "";
  const note =
    crack === "full"
      ? "Almost there. A few more messages."
      : warmth > 0
        ? "Using Claude warms the egg. It hatches at 100%."
        : "Send a message to start warming the egg.";

  return (
    <>
      <Scene clouds>
        <div class={`px-actor ${wobble}`} style={stand(76, 56)}>
          <Sprite sprite={eggSprite(crack)} scale={UNIT} label="A speckled pixel-art egg" />
        </div>
        <Meter percent={percent} color="var(--warmth)" label={`Egg warmth: ${percent} percent`} />
      </Scene>
      <div class="px-section">
        <div class="px-row">
          <h2>Warmth</h2>
          <span class="px-food-number">{percent}%</span>
        </div>
        <p class="px-dim">{note}</p>
      </div>
      <p>You name your pet when it hatches.</p>
    </>
  );
}

/** Before the extension has found the account: the user has not opened claude.ai since install. */
function FirstRun() {
  return (
    <>
      <Scene clouds>
        <div class="px-actor" style={stand(96, 56)}>
          <Sprite sprite={eggSprite("none")} scale={UNIT} label="A speckled pixel-art egg" />
        </div>
      </Scene>
      <div class="px-section">
        <h2>One step to go</h2>
        <p class="px-dim">Open Claude once so Pixiu can find your account.</p>
      </div>
      <a class="px-primary" href={CLAUDE_URL} target="_blank" rel="noreferrer">
        Open Claude
      </a>
      <p class="px-footer">After that, using Claude warms the egg.</p>
    </>
  );
}

// Hatching

type HatchFrame = "cracked" | "peeking" | "hatched";

/** Plays the three hatch frames once, each time the popup opens on a pet with no name yet. */
function useHatchFrame(playing: boolean): HatchFrame {
  const [frame, setFrame] = useState<HatchFrame>(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "hatched" : "cracked",
  );
  useEffect(() => {
    if (!playing || frame === "hatched") return;
    const next = frame === "cracked" ? "peeking" : "hatched";
    const timer = setTimeout(() => setFrame(next), frame === "cracked" ? 900 : 1500);
    return () => clearTimeout(timer);
  }, [playing, frame]);
  return playing ? frame : "hatched";
}

const SPARKLES: {
  name: "sparkle-white" | "sparkle-gold";
  left: number;
  top: number;
  pace: string;
}[] = [
  { name: "sparkle-white", left: 44, top: 36, pace: "0.9s" },
  { name: "sparkle-gold", left: 252, top: 28, pace: "1.3s" },
  { name: "sparkle-white", left: 264, top: 108, pace: "0.7s" },
  { name: "sparkle-gold", left: 28, top: 116, pace: "1.1s" },
];

function Hatching(props: PetPopupProps & { stage: Stage; frame: HatchFrame }) {
  const { pet, stage, frame, onName } = props;
  const [name, setName] = useState("");
  const baby = stage === "baby";

  let actor: ComponentChildren;
  if (!baby) {
    // Left unnamed past its first birthday: no shell anymore, but it still needs a name.
    actor = (
      <div class="px-actor px-bob" style={stand(96, actorTop(stage))}>
        <Sprite
          sprite={bodySprite(stage, "happy")}
          scale={UNIT}
          label="Your pet, waiting for a name"
        />
        <Blink row={BLINK_ROW[stage]} />
      </div>
    );
  } else if (frame === "cracked") {
    actor = (
      <div class="px-actor px-wobble px-fast" style={stand(96, 56)}>
        <Sprite
          sprite={sprite("egg-hatching")}
          scale={UNIT}
          label="The egg, cracked all the way across"
        />
      </div>
    );
  } else if (frame === "peeking") {
    actor = (
      <div class="px-actor px-hop px-fast" style={stand(96, 56)}>
        <Sprite
          sprite={sprite("hatch-peeking")}
          scale={UNIT}
          label="Two eyes looking out of the split shell"
        />
      </div>
    );
  } else {
    actor = (
      <div class="px-actor px-hop" style={stand(96, 56)}>
        <Sprite
          sprite={sprite("hatch-hatched")}
          scale={UNIT}
          label="A baby pet sitting in the bottom half of its eggshell, wearing the top half as a hat"
        />
        <Blink row={HATCHED_BLINK_ROW} />
      </div>
    );
  }

  return (
    <>
      <Scene>
        {frame === "hatched" &&
          SPARKLES.map((sparkle) => (
            <div
              key={`${sparkle.left} ${sparkle.top}`}
              class="px-prop px-twinkle"
              aria-hidden="true"
              style={{ ...place(sparkle.left, sparkle.top), "--pace": sparkle.pace }}
            >
              <Sprite sprite={sprite(sparkle.name)} scale={4} />
            </div>
          ))}
        {actor}
      </Scene>
      <form
        class="px-section"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onName(name);
        }}
      >
        <label class="px-label" for="px-name">
          Name your pet
        </label>
        <input
          id="px-name"
          class="px-input"
          type="text"
          placeholder="Type a name"
          autocomplete="off"
          maxLength={RULES.maxNameLength}
          required
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <button type="submit" class="px-primary">
          Say hello
        </button>
      </form>
      <p class="px-dim">You can rename it later in settings.</p>
      <p class="px-footer">
        {baby ? "Age 0. Its first birthday is your next weekly reset." : `Age ${pet.age}.`}
      </p>
    </>
  );
}

// The pet

const STAGE_LABEL: Record<Stage, (name: string) => string> = {
  baby: (name) => `${name} as a baby, a small jade green pet wearing a piece of eggshell`,
  child: (name) => `${name}, a jade green pixel-art pet with two small horns`,
  teen: (name) => `${name} as a teen, a taller jade green pet with long horns and a tuft of hair`,
  adult: (name) =>
    `${name} as an adult, a broad jade green pet with big curved horns and a pale chest`,
};

/** Where the "z Z" of a napping pet sits, by stage. */
const NAP_SPOT: Record<Stage, { left: number; top: number }> = {
  baby: { left: 196, top: 56 },
  child: { left: 196, top: 40 },
  teen: { left: 200, top: 16 },
  adult: { left: 200, top: 16 },
};

/** The mouth's top row, where the cookie being eaten sits. */
const MOUTH_ROW: Record<Stage, number> = { baby: 10, child: 8, teen: 8, adult: 8 };

function foodNote(mood: Mood, pet: PetState, session: UsageWindow, now: Date): string {
  if (mood === "stuffed") {
    return session.resetsAt
      ? `Full. Napping for ${timeLeftText(session.resetsAt, now)}`
      : "Full. Napping";
  }
  if (mood === "hungry") return "Not eating. Send a message to feed it";
  if (mood === "sulky") {
    const weeks = thinWeeks(pet);
    return weeks >= 2
      ? `Underfed for ${weeks} weeks. Meals fix it`
      : "Underfed lately. Meals fix it";
  }
  if (session.resetsAt) return `Session resets in ${timeLeftText(session.resetsAt, now)}`;
  return "No session running";
}

function Pet(props: { pet: PetState; now: Date; name: string; stage: Stage; mood: Mood }) {
  const { pet, now, name, stage, mood } = props;
  const session = currentWindow(pet.reading?.short, now);
  const week = currentWindow(pet.reading?.long, now);
  const top = actorTop(stage);

  const motion = mood === "stuffed" ? "px-napping" : mood === "eating" ? "px-eating" : "";
  const blinks = mood === "happy" || mood === "hungry" || mood === "eating";

  const cookies = Math.max(0, Math.min(10, Math.round(session.percent / 10)));
  // A meal can arrive as several cookies at once. The new ones drop in one after another.
  const fresh = mood === "eating" ? Math.max(1, Math.round((pet.lastBite?.points ?? 0) / 10)) : 0;
  const firstFresh = cookies - Math.min(fresh, cookies);
  const weekPercent = Math.round(week.percent);

  return (
    <>
      <Scene clouds>
        <div class={`px-actor px-bob ${motion}`} style={stand(76, top)}>
          <Sprite
            sprite={bodySprite(stage, mood)}
            scale={UNIT}
            label={`${STAGE_LABEL[stage](name)}, ${mood}`}
          />
          {blinks && <Blink row={BLINK_ROW[stage]} />}
        </div>
        {mood === "eating" && (
          // In front of the mouth, overlapping the cheek, so it reads as being eaten.
          <div
            class="px-prop px-chomp"
            aria-hidden="true"
            style={stand(76 + UNIT, top + MOUTH_ROW[stage] * UNIT, 5 * UNIT)}
          >
            <Sprite sprite={sprite("cookie-full")} scale={5} />
          </div>
        )}
        {mood === "stuffed" && (
          <div
            class="px-zz"
            aria-hidden="true"
            style={place(NAP_SPOT[stage].left, NAP_SPOT[stage].top)}
          >
            z Z
          </div>
        )}
        <Meter
          percent={weekPercent}
          color="var(--growth)"
          label={`Growth this week: ${weekPercent} percent of the way to the next birthday`}
        />
      </Scene>

      <div class="px-section">
        <div class="px-row">
          <h2>Food this session</h2>
          <span class="px-food-number">{Math.round(session.percent)}%</span>
        </div>
        <div class="px-cookies" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              class={index >= firstFresh && index < cookies ? "px-fresh" : undefined}
              style={{ "--order": index - firstFresh }}
            >
              <Sprite sprite={sprite(index < cookies ? "cookie-full" : "cookie-empty")} scale={3} />
            </div>
          ))}
        </div>
        <p class="px-dim">{foodNote(mood, pet, session, now)}</p>
      </div>

      <div class="px-row">
        <p>Growth this week</p>
        <p class="px-dim">
          {pet.weekEndsAt && Date.parse(pet.weekEndsAt) > now.getTime()
            ? `Birthday in ${timeLeftText(pet.weekEndsAt, now)}`
            : "Birthday any moment"}
        </p>
      </div>
    </>
  );
}

// Ran away

function RanAway({ name }: { name: string }) {
  return (
    <>
      <Scene clouds>
        <StillActor sprite={sprite("note-ran-away")} label="A note left on the grass" top={64} />
      </Scene>
      <div class="px-section">
        <h2>{name} ran away</h2>
        <p class="px-dim">It left a note. It comes back the next time you use Claude.</p>
      </div>
      <p class="px-footer">Its age and history are safe.</p>
    </>
  );
}

// Can't reach Claude

function lostNote(reason: UsageFailureReason, who: string): string {
  switch (reason) {
    case "signed-out":
      return `You are signed out of Claude in this browser. Sign in and ${who} picks up where it left off.`;
    case "offline":
      return `No internet connection. ${who} will look again when you are back online.`;
    case "changed":
      return "Claude changed its usage page and this extension cannot read it yet. Check for an update.";
    case "not-set-up":
      return "Open Claude once so Pixiu can find your account.";
  }
}

function Lost(props: PetPopupProps & { reason: UsageFailureReason; scene: ComponentChildren }) {
  const { pet, now, reason, scene } = props;
  const who = pet.hatchedAt === null ? "The egg" : (pet.name ?? "Your pet");
  const needsClaude = reason === "signed-out" || reason === "not-set-up";
  const waits = pet.hatchedAt === null ? "waits" : "doesn't get hungry";

  return (
    <>
      <Scene gray>
        {scene}
        <div class="px-question" aria-hidden="true">
          ?
        </div>
      </Scene>
      <div class="px-section">
        <h2>Can't reach Claude</h2>
        <p class="px-dim">{lostNote(reason, who)}</p>
      </div>
      {needsClaude && (
        <a class="px-primary" href={CLAUDE_URL} target="_blank" rel="noreferrer">
          Open Claude
        </a>
      )}
      <p class="px-footer">
        {pet.reading && `Last seen ${agoText(pet.reading.readAt, now)}. `}
        {who} {waits} while it can't see.
      </p>
    </>
  );
}

// Icons, drawn on the pixel grid

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="square"
    >
      <path d="M3 6h9M16 6h3M3 16h3M10 16h9" />
      <rect x="12" y="4" width="4" height="4" />
      <rect x="6" y="14" width="4" height="4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="square"
    >
      <path d="M5 5l12 12M17 5L5 17" />
    </svg>
  );
}
