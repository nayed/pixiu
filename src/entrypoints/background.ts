// The background worker owns the pet. It reads usage on a schedule, runs the pet engine on
// each snapshot, and saves the result; the popup only ever reads what is saved. Chrome stops
// this worker between events, so nothing is kept in memory from one wake-up to the next.

import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { validateBackup } from "@/lib/backup";
import { NAME_PET, POLL_NOW, RESTORE_BACKUP } from "@/lib/messages";
import { DEFAULT_SETTINGS } from "@/lib/pet/config";
import { describeEvent, describeView } from "@/lib/pet/describe";
import { namePet, step } from "@/lib/pet/engine";
import { newPet } from "@/lib/pet/state";
import { viewPet } from "@/lib/pet/view";
import { type LogEntry, load, savePet, savePoll, saveRestored } from "@/lib/store";
import { readUsage } from "@/lib/usage/claude";

const POLL_ALARM = "pixiu-poll";
const POLL_PERIOD_MINUTES = 5;

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void schedule();
    void enqueue(poll);
  });

  browser.runtime.onStartup.addListener(() => {
    void schedule();
    void enqueue(poll);
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM) void enqueue(poll);
  });

  // Read right away when the content script first learns the organization ID, or when the
  // user switches to another organization.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.orgId?.newValue) void enqueue(poll);
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const done = () => sendResponse({ done: true });
    if (message?.type === POLL_NOW) {
      void enqueue(poll).then(done);
      return true; // Keep the channel open for the reply.
    }
    if (message?.type === NAME_PET && typeof message.name === "string") {
      void enqueue(() => rename(message.name)).then(done);
      return true;
    }
    if (message?.type === RESTORE_BACKUP) {
      // Restore, then read usage at once so the pet catches up with the time it was away.
      void enqueue(() => restore(message.backup))
        .then(() => enqueue(poll))
        .then(done);
      return true;
    }
  });
});

// Each job reads the pet, changes it, and writes it back. Running them one at a time keeps
// two events that arrive together from overwriting each other.
let queue: Promise<void> = Promise.resolve();

function enqueue(job: () => Promise<void>): Promise<void> {
  const run = queue.then(job);
  queue = run.catch((error) => console.error("Pixiu:", error));
  return queue;
}

async function schedule(): Promise<void> {
  // Creating an alarm that already exists would restart its timer.
  if (await browser.alarms.get(POLL_ALARM)) return;
  await browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MINUTES });
}

async function poll(): Promise<void> {
  const stored = await load();
  const settings = stored.settings ?? DEFAULT_SETTINGS;
  const snapshot = await readUsage(stored.orgId);
  const at = new Date(snapshot.readAt);

  const before = stored.pet ?? newPet(at);
  const { state, events } = step(before, snapshot, settings);

  const lines = events.map(describeEvent);
  const was = describeView(viewPet(before, at, settings));
  const is = describeView(viewPet(state, at, settings));
  if (is !== was) lines.push(is);
  const entries: LogEntry[] = lines.reverse().map((text) => ({ at: snapshot.readAt, text }));

  await savePoll(snapshot, state, entries, stored.log);
}

async function rename(name: string): Promise<void> {
  const { pet } = await load();
  if (pet) await savePet(namePet(pet, name));
}

async function restore(value: unknown): Promise<void> {
  // The page that sent this already checked the file. Check again: this is the only writer.
  const backup = validateBackup(value);
  if (!backup) return;
  const entry: LogEntry = { at: new Date().toISOString(), text: "Restored from a backup" };
  await saveRestored(backup.pet, backup.settings, [entry, ...(backup.log ?? [])]);
}
