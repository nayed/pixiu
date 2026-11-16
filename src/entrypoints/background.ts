// The background worker owns the data. It reads usage on a schedule and saves each snapshot;
// the popup only ever reads what is saved. Chrome stops this worker between events, so it
// keeps nothing in memory.

import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { POLL_NOW } from "@/lib/messages";
import { load, saveSnapshot } from "@/lib/store";
import { readUsage } from "@/lib/usage/claude";

const POLL_ALARM = "pixiu-poll";
const POLL_PERIOD_MINUTES = 5;

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void schedule();
    void poll();
  });

  browser.runtime.onStartup.addListener(() => {
    void schedule();
    void poll();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM) void poll();
  });

  // Read right away when the content script first learns the organization ID, or when the
  // user switches to another organization.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.orgId?.newValue) void poll();
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== POLL_NOW) return;
    void poll().then(() => sendResponse({ done: true }));
    return true; // Keep the channel open for the reply.
  });
});

async function schedule(): Promise<void> {
  // Creating an alarm that already exists would restart its timer.
  if (await browser.alarms.get(POLL_ALARM)) return;
  await browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MINUTES });
}

async function poll(): Promise<void> {
  const { orgId } = await load();
  await saveSnapshot(await readUsage(orgId));
}
