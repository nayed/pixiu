// The milestone 1 popup: raw numbers only, to compare against Claude's own usage page.
// The pet replaces this in milestone 3.

import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { agoText, untilText } from "@/lib/format";
import { POLL_NOW } from "@/lib/messages";
import { load, onStoreChanged, type Stored } from "@/lib/store";
import type { UsageFailureReason, UsageWindow } from "@/lib/usage/snapshot";

const CLAUDE_URL = "https://claude.ai/";

const FAILURE_TEXT: Record<UsageFailureReason, string> = {
  "not-set-up": "Open Claude once so Pixiu can find your account.",
  "signed-out": "You are signed out of Claude in this browser.",
  offline: "Can't reach Claude. Check your connection.",
  changed: "Claude changed its usage page and Pixiu can't read it yet.",
};

function useStored(): Stored | null {
  const [stored, setStored] = useState<Stored | null>(null);
  useEffect(() => {
    const refresh = () => void load().then(setStored);
    refresh();
    return onStoreChanged(refresh);
  }, []);
  return stored;
}

/** The current time, refreshed often enough to keep the countdowns honest. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Meter(props: { label: string; idle: string; window: UsageWindow; now: Date }) {
  const { label, idle, window, now } = props;
  return (
    <section>
      <h2>{label}</h2>
      <p class="percent">{window.percent}%</p>
      <p class="detail">
        {window.resetsAt ? (
          <>
            Resets {untilText(window.resetsAt, now)}
            <br />
            <time dateTime={window.resetsAt}>{new Date(window.resetsAt).toLocaleString()}</time>
          </>
        ) : (
          idle
        )}
      </p>
    </section>
  );
}

export function App() {
  const stored = useStored();
  const now = useNow();
  const [checking, setChecking] = useState(false);

  if (!stored) return null;
  const { snapshot, lastReading } = stored;
  const failure = snapshot && !snapshot.ok ? snapshot.reason : null;
  const needsClaude = failure === "not-set-up" || failure === "signed-out";

  const checkNow = async () => {
    setChecking(true);
    try {
      await browser.runtime.sendMessage({ type: POLL_NOW });
    } finally {
      setChecking(false);
    }
  };

  return (
    <main>
      <h1>Pixiu</h1>

      {failure && (
        <p class="notice" role="status">
          {FAILURE_TEXT[failure]}
        </p>
      )}
      {!snapshot && <p class="detail">Reading usage for the first time.</p>}

      {lastReading && (
        <div class={failure ? "meters stale" : "meters"}>
          <Meter label="Session" idle="No session running" window={lastReading.short} now={now} />
          <Meter label="Week" idle="No reset scheduled" window={lastReading.long} now={now} />
        </div>
      )}
      {lastReading && <p class="detail">Last seen {agoText(lastReading.readAt, now)}</p>}

      <div class="actions">
        {needsClaude && (
          <a class="button primary" href={CLAUDE_URL} target="_blank" rel="noreferrer">
            Open Claude
          </a>
        )}
        <button type="button" class="button" onClick={checkNow} disabled={checking}>
          {checking ? "Checking" : "Check now"}
        </button>
      </div>
    </main>
  );
}
