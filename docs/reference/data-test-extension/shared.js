// Shared by the content script, the background worker, and the popup.
// Nothing here talks to any host other than claude.ai, and nothing leaves the browser.

const ORG_ID_PATTERN = /\/api\/organizations\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const LOG_LIMIT = 30;

function usageUrl(orgId) {
  return `https://claude.ai/api/organizations/${orgId}/usage`;
}

// Pull the four values the pet needs out of whatever the endpoint returns.
// Written defensively: the response shape is undocumented and may differ.
function summarize(json) {
  const pick = (window) => {
    if (!window || typeof window !== "object") return null;
    return {
      percent: typeof window.utilization === "number" ? window.utilization : null,
      resetsAt: window.resets_at ?? null,
    };
  };
  return {
    session: pick(json?.five_hour),
    week: pick(json?.seven_day),
    topLevelKeys: json && typeof json === "object" ? Object.keys(json) : [],
  };
}

// One usage read. `source` is "tab" or "background".
async function readUsage(orgId, source) {
  const entry = { source, at: new Date().toISOString(), ok: false };
  try {
    const response = await fetch(usageUrl(orgId), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    entry.status = response.status;
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      entry.summary = summarize(json);
      entry.raw = json;
      entry.ok = response.ok && (entry.summary.session !== null || entry.summary.week !== null);
      if (response.ok && !entry.ok) entry.note = "Got JSON, but not the expected five_hour / seven_day shape.";
    } catch {
      entry.note = "Response was not JSON (a login page or a bot check, most likely).";
      entry.bodyStart = text.slice(0, 200);
    }
  } catch (error) {
    entry.note = `Request failed: ${error?.message ?? error}`;
  }
  return entry;
}

async function appendLog(entry) {
  const { log = [] } = await chrome.storage.local.get("log");
  log.unshift(entry);
  await chrome.storage.local.set({ log: log.slice(0, LOG_LIMIT) });
}
