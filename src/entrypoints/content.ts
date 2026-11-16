// Runs in every claude.ai tab. Its one job is to learn the organization ID by watching which
// URLs the page itself requests, so the user is never asked for it.

import { defineContentScript } from "wxt/utils/define-content-script";
import { load, saveOrgId } from "@/lib/store";
import { ORG_ID_PATTERN } from "@/lib/usage/claude";

const SEARCH_TIMEOUT_MS = 20_000;

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  runAt: "document_idle",
  async main() {
    const orgId = await findOrgId(SEARCH_TIMEOUT_MS);
    if (!orgId) return;
    const { orgId: known } = await load();
    if (orgId !== known) await saveOrgId(orgId);
  },
});

function findOrgId(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const scan = (entries: PerformanceEntry[]): string | null => {
      for (const entry of entries) {
        const match = ORG_ID_PATTERN.exec(entry.name);
        if (match?.[1]) return match[1];
      }
      return null;
    };

    const already = scan(performance.getEntriesByType("resource"));
    if (already) {
      resolve(already);
      return;
    }

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
