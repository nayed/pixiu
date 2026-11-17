// The real popup: the pet, read from storage. Only the background worker writes the pet, so
// naming goes there as a message.

import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { NAME_PET, POLL_NOW } from "@/lib/messages";
import { DEFAULT_SETTINGS } from "@/lib/pet/config";
import { newPet } from "@/lib/pet/state";
import { load, onStoreChanged, type Stored, saveSettings } from "@/lib/store";
import { PetPopup } from "@/ui/PetPopup";

/** Opening the popup asks for a fresh read, unless the last one is this recent. */
const FRESH_MS = 60_000;

function useStored(): Stored | null {
  const [stored, setStored] = useState<Stored | null>(null);
  useEffect(() => {
    const refresh = () => void load().then(setStored);
    refresh();
    return onStoreChanged(refresh);
  }, []);
  return stored;
}

/** The current time, refreshed often enough to keep the countdowns and the mood honest. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function App() {
  const stored = useStored();
  const now = useNow();
  const loaded = stored !== null;
  const lastReadAt = stored?.snapshot?.readAt;

  // Runs once, when storage has loaded. Later reads must not trigger another.
  useEffect(() => {
    if (!loaded) return;
    // The distance either way: after the clock is set back, the last read looks like the future.
    const age = lastReadAt
      ? Math.abs(Date.now() - Date.parse(lastReadAt))
      : Number.POSITIVE_INFINITY;
    if (age > FRESH_MS) void browser.runtime.sendMessage({ type: POLL_NOW });
  }, [loaded]);

  if (!stored) return null;
  return (
    <PetPopup
      // Before the first poll has saved a pet, show the egg it is about to be.
      pet={stored.pet ?? newPet(now)}
      now={now}
      settings={stored.settings ?? DEFAULT_SETTINGS}
      onName={(name) => void browser.runtime.sendMessage({ type: NAME_PET, name })}
      onSaveSettings={(settings) => void saveSettings(settings)}
      debugUrl={browser.runtime.getURL("/debug.html")}
    />
  );
}
