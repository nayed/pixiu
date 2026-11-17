// Runs in every claude.ai tab. It learns the organization ID by watching which URLs the page
// itself requests, so the user is never asked for it. It also puts the pet on the page and
// asks for a fresh usage read when a reply finishes, so the pet eats while you watch.

import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { POLL_NOW } from "@/lib/messages";
import { startOverlay } from "@/lib/overlay/frame";
import { load, saveOrgId } from "@/lib/store";
import { ORG_ID_PATTERN } from "@/lib/usage/claude";

const SEARCH_TIMEOUT_MS = 20_000;

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  runAt: "document_idle",
  async main() {
    startOverlay();
    watchReplies();
    const orgId = await findOrgId(SEARCH_TIMEOUT_MS);
    if (!orgId) return;
    const { orgId: known } = await load();
    if (orgId !== known) await saveOrgId(orgId);
  },
});

/** Claude streams each reply from an address ending in "completion". */
const REPLY_PATTERN = /\/(retry_)?completion(\?|$)/;
/** Usage takes a moment to show the reply that just ended. */
const READ_DELAY_MS = 2_000;
const READ_AT_MOST_EVERY_MS = 15_000;

/**
 * Asks the background worker for a usage read when a reply finishes, so the meal shows on the
 * page within seconds, not at the next five-minute poll. If Claude renames the address, this
 * quietly stops and the regular poll still feeds the pet.
 */
function watchReplies(): void {
  let lastAsked = 0;
  new PerformanceObserver((list) => {
    // A resource entry appears when its response has ended, which is when the reply is done.
    if (!list.getEntries().some((entry) => REPLY_PATTERN.test(entry.name))) return;
    if (Date.now() - lastAsked < READ_AT_MOST_EVERY_MS) return;
    lastAsked = Date.now();
    setTimeout(() => {
      // Fails only when the extension was reloaded under this tab; nothing to do then.
      browser.runtime.sendMessage({ type: POLL_NOW }).catch(() => {});
    }, READ_DELAY_MS);
  }).observe({ type: "resource", buffered: false });
}

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
