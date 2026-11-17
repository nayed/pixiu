// The debug page: a pretend Claude and a pretend clock driving the real pet engine, so states
// that take weeks to reach can be seen in seconds. The simulation never touches the real pet;
// only the backup section at the top does.

import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { toolbarIcon } from "@/lib/icon";
import { DEFAULT_SETTINGS, WEEK_MS } from "@/lib/pet/config";
import { describeEvent, describeView } from "@/lib/pet/describe";
import { namePet } from "@/lib/pet/engine";
import { hungerMs, viewPet } from "@/lib/pet/view";
import {
  createSimulation,
  feed,
  poll,
  type Simulation,
  setFailure,
  sleep,
  wait,
} from "@/lib/sim/simulation";
import type { UsageFailureReason } from "@/lib/usage/snapshot";
import { BackupSection } from "@/ui/Backup";
import { Overlay } from "@/ui/Overlay";
import { PetPopup } from "@/ui/PetPopup";
import { IconPreview } from "./IconPreview";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const settings = DEFAULT_SETTINGS;

const FEEDS = [1, 10, 22, 100];
const WAITS: [string, number][] = [
  ["5 min", 5 * MINUTE],
  ["1 h", HOUR],
  ["8 h", 8 * HOUR],
  ["1 day", DAY],
  ["1 week", WEEK_MS],
];
const FAILURES: UsageFailureReason[] = ["offline", "signed-out", "changed", "not-set-up"];

function start(): Simulation {
  const now = new Date();
  // The first read only sets the baseline, so make it now and let every button count.
  return poll(createSimulation(now, new Date(now.getTime() + 3 * DAY)), settings);
}

function when(time: number | string | null): string {
  if (time === null) return "none";
  return new Date(time).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function App() {
  const [sim, setSimulation] = useState(start);
  const [name, setName] = useState("");
  const [sleepHours, setSleepHours] = useState(settings);
  const [overlayShown, setOverlayShown] = useState(true);
  const { fake, pet } = sim;
  // The pretend clock also ticks in real time, so countdowns and the end of a meal show up.
  const [ticked, setTicked] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicked((value) => value + 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  const now = new Date(fake.now);
  const shownNow = new Date(fake.now + ticked);
  const setSim = (next: Simulation) => {
    setTicked(0);
    setSimulation(next);
  };
  const hungryHours = (hungerMs(pet, now, settings) / HOUR).toFixed(1);

  return (
    <main>
      <aside class="preview">
        <PetPopup
          pet={pet}
          now={shownNow}
          settings={sleepHours}
          onName={(newName) => setSim({ ...sim, pet: namePet(pet, newName) })}
          onSaveSettings={setSleepHours}
          overlayShown={overlayShown}
          onShowOverlay={setOverlayShown}
        />
        <p class="preview-note">
          The popup and the toolbar icon, as they would look for the pretend pet.
        </p>
        <IconPreview icon={toolbarIcon(viewPet(pet, shownNow, sleepHours), pet, shownNow)} />
        <p class="preview-note">The overlay on the Claude page, with its card held open.</p>
        <div class="overlay-preview">
          {overlayShown ? (
            <Overlay
              pet={pet}
              now={shownNow}
              settings={sleepHours}
              onName={(newName) => setSim({ ...sim, pet: namePet(pet, newName) })}
              onHide={() => setOverlayShown(false)}
              open
            />
          ) : (
            <p class="detail">Hidden. The popup's switch brings it back.</p>
          )}
        </div>
      </aside>

      <div class="controls">
        <h1>Pixiu debug</h1>

        {/* Only inside the extension: the page can also be opened as a plain file to try it. */}
        {browser?.runtime?.id && <BackupSection />}

        <section>
          <h2>Pretend pet</h2>
          <p class="detail">
            A pretend Claude and a pretend clock, polled every 5 minutes. Nothing below touches your
            real pet.
          </p>
          <p class="headline">{describeView(viewPet(pet, now, settings))}</p>
          <dl>
            <dt>Clock</dt>
            <dd>{when(fake.now)}</dd>
            <dt>Session</dt>
            <dd>
              {Math.round(fake.session.percent)}%, resets {when(fake.session.resetsAt)}
            </dd>
            <dt>Week</dt>
            <dd>
              {Math.round(fake.week.percent)}%, resets {when(fake.week.resetsAt)}
            </dd>
            <dt>Waking time since last meal</dt>
            <dd>{pet.hatchedAt === null ? "not hatched" : `${hungryHours} h`}</dd>
            <dt>Peak this week</dt>
            <dd>{pet.weekPeak}%</dd>
            <dt>Peaks of past weeks</dt>
            <dd>
              {pet.weeks.length > 0 ? pet.weeks.map((peak) => `${peak}%`).join(", ") : "none"}
            </dd>
          </dl>
        </section>

        <section>
          <h2>Use Claude</h2>
          <div class="row">
            {FEEDS.map((points) => (
              <button
                type="button"
                class="button"
                key={points}
                onClick={() => setSim(feed(sim, points, settings))}
              >
                {points === 100 ? "Fill the session" : `+${points}%`}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Let time pass</h2>
          <div class="row">
            {WAITS.map(([label, ms]) => (
              <button
                type="button"
                class="button"
                key={label}
                onClick={() => setSim(wait(sim, ms, settings))}
              >
                {label}
              </button>
            ))}
          </div>
          <h2>With the browser closed</h2>
          <div class="row">
            {WAITS.slice(2).map(([label, ms]) => (
              <button
                type="button"
                class="button"
                key={label}
                onClick={() => setSim(wait(sleep(sim, ms - 5 * MINUTE), 5 * MINUTE, settings))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Other controls</h2>
          <div class="row">
            <label>
              Reads{" "}
              <select
                value={fake.failure ?? "ok"}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSim(
                    setFailure(
                      sim,
                      value === "ok" ? null : (value as UsageFailureReason),
                      settings,
                    ),
                  );
                }}
              >
                <option value="ok">work</option>
                {FAILURES.map((reason) => (
                  <option value={reason} key={reason}>
                    fail: {reason}
                  </option>
                ))}
              </select>
            </label>
            <form
              class="row"
              onSubmit={(event) => {
                event.preventDefault();
                setSim({ ...sim, pet: namePet(pet, name) });
              }}
            >
              <label>
                Name <input value={name} onInput={(event) => setName(event.currentTarget.value)} />
              </label>
              <button type="submit" class="button" disabled={pet.hatchedAt === null}>
                Set name
              </button>
            </form>
            <button type="button" class="button" onClick={() => setSim(start())}>
              Start over
            </button>
          </div>
        </section>

        <section>
          <h2>What happened, newest first</h2>
          {sim.events.length === 0 && <p class="detail">Nothing yet.</p>}
          <ol class="log">
            {sim.events
              .slice(-40)
              .reverse()
              .map((event, index) => (
                <li key={index}>
                  <time dateTime={event.at}>{when(event.at)}</time> {describeEvent(event)}
                </li>
              ))}
          </ol>
        </section>

        <details>
          <summary>Raw state</summary>
          <pre>{JSON.stringify(pet, null, 2)}</pre>
        </details>
      </div>
    </main>
  );
}
