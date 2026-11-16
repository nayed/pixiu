// Everything the extension keeps lives in chrome.storage.local, and every surface reads it
// from there. Nothing is held in memory between wake-ups of the background worker.

import { browser } from "wxt/browser";
import type { Settings } from "./pet/config";
import type { PetState } from "./pet/state";
import type { UsageReading, UsageSnapshot } from "./usage/snapshot";

export type LogEntry = { at: string; text: string };

const LOG_LIMIT = 100;

export type Stored = {
  /** The claude.ai organization ID, learned by the content script. */
  orgId?: string;
  /** The most recent read, successful or not. */
  snapshot?: UsageSnapshot;
  /** The most recent successful read. */
  lastReading?: UsageReading;
  /** The pet. Only the background worker writes it. */
  pet?: PetState;
  settings?: Settings;
  /** What happened to the pet, newest first. */
  log?: LogEntry[];
};

const KEYS: (keyof Stored)[] = ["orgId", "snapshot", "lastReading", "pet", "settings", "log"];

export async function load(): Promise<Stored> {
  return (await browser.storage.local.get(KEYS)) as Stored;
}

export async function saveOrgId(orgId: string): Promise<void> {
  await browser.storage.local.set({ orgId });
}

/** Saves the result of one poll in a single write, so no surface sees half of it. */
export async function savePoll(
  snapshot: UsageSnapshot,
  pet: PetState,
  newEntries: LogEntry[],
  oldLog: LogEntry[] = [],
): Promise<void> {
  const update: Stored = { snapshot, pet };
  if (snapshot.ok) update.lastReading = snapshot;
  if (newEntries.length > 0) update.log = [...newEntries, ...oldLog].slice(0, LOG_LIMIT);
  await browser.storage.local.set(update);
}

export async function savePet(pet: PetState): Promise<void> {
  await browser.storage.local.set({ pet });
}

/** Calls back whenever anything in the store changes. Returns a function that stops listening. */
export function onStoreChanged(callback: () => void): () => void {
  const listener = (_changes: unknown, area: string) => {
    if (area === "local") callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
