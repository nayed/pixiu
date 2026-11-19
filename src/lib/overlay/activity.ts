// When to read usage while someone is using claude.ai, so the pet on the page eats within
// seconds instead of at the next five-minute poll. Claude streams replies in ways the page's
// network timings do not show, so this does not try to spot replies at all: while the tab is
// in front and the person has typed, clicked, or scrolled lately, it reads every few seconds.

/** How long after the last key, click, or scroll the page still counts as in use. */
export const ACTIVE_FOR_MS = 5 * 60_000;
/** How often to read while the page is in use. */
export const READ_EVERY_MS = 20_000;

export type Activity = {
  now: number;
  /** Whether the tab is the one showing in its window. */
  visible: boolean;
  lastActiveAt: number;
  lastReadAt: number;
};

export function wantsRead({ now, visible, lastActiveAt, lastReadAt }: Activity): boolean {
  return visible && now - lastActiveAt < ACTIVE_FOR_MS && now - lastReadAt >= READ_EVERY_MS;
}
