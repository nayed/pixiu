// Runs inside every claude.ai tab.
// Step 1: learn the organization id by watching which URLs the page itself requests.
// Step 2: read the usage endpoint from inside the tab (same origin, your normal session).

(async () => {
  const orgId = await findOrgId(20000);
  if (!orgId) {
    await appendLog({
      source: "tab",
      at: new Date().toISOString(),
      ok: false,
      note: "Could not find an organization id in the page's own requests within 20 s. Try opening Settings > Usage.",
    });
    return;
  }
  await chrome.storage.local.set({ orgId });
  await appendLog(await readUsage(orgId, "tab"));
})();

function findOrgId(timeoutMs) {
  return new Promise((resolve) => {
    const scan = (entries) => {
      for (const entry of entries) {
        const match = ORG_ID_PATTERN.exec(entry.name);
        if (match) return match[1];
      }
      return null;
    };

    const already = scan(performance.getEntriesByType("resource"));
    if (already) return resolve(already);

    const observer = new PerformanceObserver((list) => {
      const found = scan(list.getEntries());
      if (found) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(found);
      }
    });
    observer.observe({ type: "resource", buffered: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}
