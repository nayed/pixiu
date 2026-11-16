// Everything the extension keeps lives in chrome.storage.local, and every surface reads it
// from there. Nothing is held in memory between wake-ups of the background worker.

import { browser } from "wxt/browser";
import type { UsageReading, UsageSnapshot } from "./usage/snapshot";

export type Stored = {
  /** The claude.ai organization ID, learned by the content script. */
  orgId?: string;
  /** The most recent read, successful or not. */
  snapshot?: UsageSnapshot;
  /** The most recent successful read. */
  lastReading?: UsageReading;
};

export async function load(): Promise<Stored> {
  return (await browser.storage.local.get(["orgId", "snapshot", "lastReading"])) as Stored;
}

export async function saveOrgId(orgId: string): Promise<void> {
  await browser.storage.local.set({ orgId });
}

export async function saveSnapshot(snapshot: UsageSnapshot): Promise<void> {
  const update: Stored = snapshot.ok ? { snapshot, lastReading: snapshot } : { snapshot };
  await browser.storage.local.set(update);
}

/** Calls back whenever anything in the store changes. Returns a function that stops listening. */
export function onStoreChanged(callback: () => void): () => void {
  const listener = (_changes: unknown, area: string) => {
    if (area === "local") callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
