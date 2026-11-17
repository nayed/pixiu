// The content script's side of the overlay: a frame in the corner of the Claude page that
// shows the extension's own overlay page. A frame keeps Claude's styles out of the pet and the
// pet's styles out of Claude. This file places, sizes, and moves the frame; nothing else.

import { browser } from "wxt/browser";
import { DEFAULT_OVERLAY, load, type OverlayPrefs, onStoreChanged, saveOverlay } from "@/lib/store";
import { isOverlayMessage, WINDOW_HEIGHT, WINDOW_WIDTH } from "./messages";

/** The card is 236 px wide and never taller than this; anything larger is not ours. */
const MAX_WIDTH = 320;
const MAX_HEIGHT = 480;

export function startOverlay(): void {
  const origin = new URL(browser.runtime.getURL("/")).origin;
  let frame: HTMLIFrameElement | null = null;
  let spot = { right: DEFAULT_OVERLAY.right, bottom: DEFAULT_OVERLAY.bottom };
  let dragging = false;

  const place = () => {
    if (!frame) return;
    // Keep the window itself on screen, whatever the saved spot or the size of the tab.
    const right = Math.max(0, Math.min(spot.right, window.innerWidth - WINDOW_WIDTH));
    const bottom = Math.max(0, Math.min(spot.bottom, window.innerHeight - WINDOW_HEIGHT));
    frame.style.right = `${right}px`;
    frame.style.bottom = `${bottom}px`;
  };

  const show = () => {
    frame = document.createElement("iframe");
    frame.src = browser.runtime.getURL("/overlay.html");
    frame.title = "Pixiu, your pet";
    Object.assign(frame.style, {
      position: "fixed",
      zIndex: "2147483000",
      width: `${WINDOW_WIDTH}px`,
      height: `${WINDOW_HEIGHT}px`,
      border: "0",
      margin: "0",
      padding: "0",
      background: "transparent",
      // A frame whose color scheme differs from its page gets a solid backdrop.
      colorScheme: "light",
    });
    place();
    // On the root element, not the body: Claude redraws its body and would drop the frame.
    document.documentElement.append(frame);
  };

  const sync = async () => {
    let prefs: OverlayPrefs;
    try {
      prefs = (await load()).overlay ?? DEFAULT_OVERLAY;
    } catch {
      // The extension was reloaded or removed under this tab. Take the pet off the page.
      frame?.remove();
      frame = null;
      return;
    }
    if (!dragging) spot = { right: prefs.right, bottom: prefs.bottom };
    if (prefs.show && !frame) show();
    if (!prefs.show && frame) {
      frame.remove();
      frame = null;
    }
    place();
  };

  window.addEventListener("message", (event) => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return;
    const message: unknown = event.data;
    if (!isOverlayMessage(message)) return;

    if (message.type === "pixiu-size") {
      frame.style.width = `${Math.min(MAX_WIDTH, Math.max(WINDOW_WIDTH, message.width))}px`;
      frame.style.height = `${Math.min(MAX_HEIGHT, Math.max(WINDOW_HEIGHT, message.height))}px`;
    } else if (message.type === "pixiu-drag") {
      dragging = true;
      spot = {
        right: Math.max(0, Math.min(spot.right - message.dx, window.innerWidth - WINDOW_WIDTH)),
        bottom: Math.max(0, Math.min(spot.bottom - message.dy, window.innerHeight - WINDOW_HEIGHT)),
      };
      place();
    } else {
      dragging = false;
      void saveOverlay({ show: true, ...spot }).catch(() => {});
    }
  });

  window.addEventListener("resize", place);
  onStoreChanged(() => void sync());
  void sync();
}
