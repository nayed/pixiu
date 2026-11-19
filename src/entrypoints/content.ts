// Runs in every claude.ai tab. It learns the organization ID by watching which URLs the page
// itself requests, so the user is never asked for it. It also puts the pet on the page and
// asks for a fresh usage read when a reply finishes, so the pet eats while you watch.

import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { POLL_NOW } from "@/lib/messages";
import { startOverlay } from "@/lib/overlay/frame";
import { isReplyEnd, READ_AFTER_MS } from "@/lib/overlay/replies";
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

/** Never ask for reads closer together than this, however many replies end. */
const READ_AT_MOST_EVERY_MS = 2_000;

/**
 * Asks the background worker for usage reads when a reply finishes, so the meal shows on the
 * page within seconds or a minute, not at the next five-minute poll. If this misses a reply,
 * the regular poll still feeds the pet.
 */
function watchReplies(): void {
  let timers: ReturnType<typeof setTimeout>[] = [];
  let lastAsked = 0;

  const read = () => {
    if (Date.now() - lastAsked < READ_AT_MOST_EVERY_MS) return;
    lastAsked = Date.now();
    // Fails only when the extension was reloaded under this tab; nothing to do then.
    browser.runtime.sendMessage({ type: POLL_NOW }).catch(() => {});
  };

  new PerformanceObserver((list) => {
    // A resource entry appears when its response has ended, which is when the reply is done.
    const reply = list.getEntries().find((entry) => isReplyEnd(entry as PerformanceResourceTiming));
    if (!reply) return;
    // Says which request counted as a reply, in the page's console, in case this needs fixing.
    console.info("Pixiu: a reply ended, reading usage soon.", new URL(reply.name).pathname);
    for (const timer of timers) clearTimeout(timer);
    timers = READ_AFTER_MS.map((delay) => setTimeout(read, delay));
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
