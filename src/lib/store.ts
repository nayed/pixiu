// Everything the extension keeps lives in chrome.storage.local, and every surface reads it
// from there. Nothing is held in memory between wake-ups of the background worker.

import { browser } from "wxt/browser";
import type { Settings } from "./pet/config";
import {
  type PetState,
  type PetStateV1,
  type PetStateV2,
  type PetStateV3,
  upgradePet,
} from "./pet/state";
import type { UsageReading, UsageSnapshot } from "./usage/snapshot";

export type LogEntry = { at: string; text: string };

const LOG_LIMIT = 100;

/** Whether the pet shows on the Claude page, and where its window sits, from the bottom right. */
export type OverlayPrefs = { show: boolean; right: number; bottom: number };

export const DEFAULT_OVERLAY: OverlayPrefs = { show: true, right: 36, bottom: 36 };

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
  overlay?: OverlayPrefs;
};

const KEYS: (keyof Stored)[] = [
  "orgId",
  "snapshot",
  "lastReading",
  "pet",
  "settings",
  "log",
  "overlay",
];

/** Reads everything. A pet saved by an older version comes back in today's shape. */
export async function load(): Promise<Stored> {
  const raw = (await browser.storage.local.get(KEYS)) as Omit<Stored, "pet"> & {
    pet?: PetState | PetStateV3 | PetStateV2 | PetStateV1;
  };
  const { pet, ...rest } = raw;
  return pet ? { ...rest, pet: upgradePet(pet) } : rest;
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

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

export async function saveOverlay(overlay: OverlayPrefs): Promise<void> {
  await browser.storage.local.set({ overlay });
}

export async function savePet(pet: PetState): Promise<void> {
  await browser.storage.local.set({ pet });
}

/** Replaces the pet with one from a backup. Settings and log are replaced only if the backup has them. */
export async function saveRestored(
  pet: PetState,
  settings: Settings | undefined,
  log: LogEntry[],
): Promise<void> {
  const update: Stored = { pet, log: log.slice(0, LOG_LIMIT) };
  if (settings) update.settings = settings;
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
