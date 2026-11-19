// Telling, from the page's network requests, that Claude just finished a reply. Claude's
// addresses are undocumented, so this does not depend on one name: a reply is streamed, and a
// streamed request to Claude's API stays open for seconds, while everything else is quick.

/** The address Claude has used for replies. Matched first, but not relied on. */
const REPLY_PATTERN = /\/(retry_)?completion(\?|$)/;
/** A request to Claude's API that stays open this long is taken to be a streamed reply. */
export const STREAMED_MS = 2_000;

/** What this needs from a resource timing entry, so it can be tested without a browser. */
export type RequestEntry = { name: string; initiatorType: string; duration: number };

export function isReplyEnd(entry: RequestEntry): boolean {
  if (entry.initiatorType !== "fetch" && entry.initiatorType !== "xmlhttprequest") return false;
  let url: URL;
  try {
    url = new URL(entry.name);
  } catch {
    return false;
  }
  if (url.hostname !== "claude.ai" || !url.pathname.startsWith("/api/")) return false;
  // The usage address itself is never a meal.
  if (url.pathname.endsWith("/usage")) return false;
  return REPLY_PATTERN.test(url.pathname) || entry.duration >= STREAMED_MS;
}

/**
 * When to read usage after a reply ends, in milliseconds. Claude can take a while to count a
 * reply, so one early read is often too soon; the later ones catch it. Each read is one small
 * request, and a new reply starts the list over.
 */
export const READ_AFTER_MS = [3_000, 20_000, 60_000];
