// A backup of the pet as a JSON file, so removing the extension does not have to cost the pet.
// It holds the pet, the settings, and the log. It leaves out the organization ID and the raw
// usage response, which are account details and are learned again on their own.

import type { Settings } from "./pet/config";
import { type PetState, type PetStateV1, upgradePet } from "./pet/state";
import type { LogEntry } from "./store";
import type { UsageWindow } from "./usage/snapshot";

const FORMAT = "pixiu-backup";

export type Backup = {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  pet: PetState;
  settings?: Settings;
  log?: LogEntry[];
};

export function createBackup(
  pet: PetState,
  settings: Settings | undefined,
  log: LogEntry[] | undefined,
  now: Date,
): Backup {
  return { format: FORMAT, version: 1, exportedAt: now.toISOString(), pet, settings, log };
}

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isTime = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
const isTimeOrNull = (value: unknown) => value === null || isTime(value);
const isAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isCount = (value: unknown) => isAmount(value) && Number.isInteger(value);

const isWindow = (value: unknown): value is UsageWindow =>
  isRecord(value) && isAmount(value.percent) && isTimeOrNull(value.resetsAt);

function isReading(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.ok === true &&
    isTime(value.readAt) &&
    isWindow(value.short) &&
    isWindow(value.long)
  );
}

/** A pet as this version saves it, or as 0.1.0 saved it, before pets had XP. */
function isPet(value: unknown): value is PetState | PetStateV1 {
  if (!isRecord(value)) return false;
  const bite = value.lastBite;
  return (
    (value.version === 1 || (value.version === 2 && isAmount(value.xp))) &&
    isTime(value.bornAt) &&
    (value.name === null || typeof value.name === "string") &&
    isAmount(value.warmth) &&
    isTimeOrNull(value.hatchedAt) &&
    isCount(value.age) &&
    (value.reading === null || isReading(value.reading)) &&
    (value.blind === null || typeof value.blind === "string") &&
    isTimeOrNull(value.lastMealAt) &&
    isAmount(value.hungerMs) &&
    (bite === null || (isRecord(bite) && isTime(bite.at) && isAmount(bite.points))) &&
    isTimeOrNull(value.weekEndsAt) &&
    isAmount(value.weekPeak) &&
    Array.isArray(value.weeks) &&
    value.weeks.every(isAmount) &&
    typeof value.ranAway === "boolean"
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value) || !isRecord(value.sleep)) return false;
  const isMinute = (minute: unknown) => isCount(minute) && (minute as number) < 24 * 60;
  return isMinute(value.sleep.startMinute) && isMinute(value.sleep.endMinute);
}

function isLog(value: unknown): value is LogEntry[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isRecord(entry) && isTime(entry.at) && typeof entry.text === "string")
  );
}

/**
 * Checks a parsed backup. Returns it cleaned of anything unexpected, with the pet brought up to
 * date, or null if it is not one.
 */
export function validateBackup(value: unknown): Backup | null {
  if (!isRecord(value) || value.format !== FORMAT || value.version !== 1) return null;
  if (!isTime(value.exportedAt) || !isPet(value.pet)) return null;
  return {
    format: FORMAT,
    version: 1,
    exportedAt: value.exportedAt,
    pet: upgradePet(value.pet),
    settings: isSettings(value.settings) ? value.settings : undefined,
    log: isLog(value.log) ? value.log : undefined,
  };
}

/** Reads the text of a backup file. Returns null for anything that is not a backup. */
export function parseBackup(text: string): Backup | null {
  try {
    return validateBackup(JSON.parse(text));
  } catch {
    return null;
  }
}
