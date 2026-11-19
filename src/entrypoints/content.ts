// Runs in every claude.ai tab. It learns the organization ID by watching which URLs the page
// itself requests, so the user is never asked for it. It also puts the pet on the page and,
// while the page is in use, asks for usage reads often enough that the pet eats as you watch.

import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { POLL_NOW } from "@/lib/messages";
import { wantsRead } from "@/lib/overlay/activity";
import { startOverlay } from "@/lib/overlay/frame";
import { load, saveOrgId } from "@/lib/store";
import { ORG_ID_PATTERN } from "@/lib/usage/claude";

const SEARCH_TIMEOUT_MS = 20_000;

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  runAt: "document_idle",
  async main() {
    startOverlay();
    watchActivity();
    const orgId = await findOrgId(SEARCH_TIMEOUT_MS);
    if (!orgId) return;
    const { orgId: known } = await load();
    if (orgId !== known) await saveOrgId(orgId);
  },
});

/** How often to check whether a read is due. */
const CHECK_EVERY_MS = 5_000;

/**
 * Asks the background worker for usage reads every few seconds while this tab is in front and
 * in use, so a meal shows on the page soon after the reply that caused it. Otherwise the
 * regular five-minute poll feeds the pet.
 */
function watchActivity(): void {
  let lastActiveAt = Date.now();
  let lastReadAt = 0;

  const active = () => {
    lastActiveAt = Date.now();
  };
  for (const type of ["keydown", "pointerdown", "wheel", "touchstart"]) {
    window.addEventListener(type, active, { capture: true, passive: true });
  }

  const timer = setInterval(() => {
    const now = Date.now();
    const visible = document.visibilityState === "visible";
    if (!wantsRead({ now, visible, lastActiveAt, lastReadAt })) return;
    lastReadAt = now;
    browser.runtime.sendMessage({ type: POLL_NOW }).catch(() => {
      // The extension was reloaded or removed under this tab. Stop asking.
      clearInterval(timer);
    });
  }, CHECK_EVERY_MS);
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
