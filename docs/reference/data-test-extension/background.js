// Background worker. Answers the question: can usage be read with no Claude tab open?
// It polls every 2 minutes and records whether a claude.ai tab existed at that moment.

importScripts("shared.js");

const ALARM = "token-pet-test-poll";
const PERIOD_MINUTES = 2;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) poll();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "poll-now") {
    poll().then(() => sendResponse({ done: true }));
    return true; // keep the channel open for the async reply
  }
});

async function poll() {
  const { orgId } = await chrome.storage.local.get("orgId");
  const claudeTabs = await chrome.tabs.query({ url: "https://claude.ai/*" });

  if (!orgId) {
    await appendLog({
      source: "background",
      at: new Date().toISOString(),
      ok: false,
      claudeTabsOpen: claudeTabs.length,
      note: "No organization id yet. Open claude.ai once so the tab test can find it.",
    });
    return;
  }

  const entry = await readUsage(orgId, "background");
  entry.claudeTabsOpen = claudeTabs.length;
  await appendLog(entry);
}
