// The overlay page. The content script shows it in a frame in the corner of the Claude page.
// It reads the pet from storage like the popup does, and asks the content script, which owns
// the frame, to resize or move it.

import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { NAME_PET } from "@/lib/messages";
import type { OverlayMessage } from "@/lib/overlay/messages";
import { DEFAULT_SETTINGS } from "@/lib/pet/config";
import { newPet } from "@/lib/pet/state";
import { DEFAULT_OVERLAY, load, onStoreChanged, type Stored, saveOverlay } from "@/lib/store";
import { Overlay } from "@/ui/Overlay";
import "./style.css";

const CLAUDE_ORIGIN = "https://claude.ai";

function tell(message: OverlayMessage): void {
  if (window.parent !== window) window.parent.postMessage(message, CLAUDE_ORIGIN);
}

function App() {
  const [stored, setStored] = useState<Stored | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => void load().then(setStored);
    refresh();
    return onStoreChanged(refresh);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  if (!stored) return null;
  return (
    <Overlay
      pet={stored.pet ?? newPet(now)}
      now={now}
      settings={stored.settings ?? DEFAULT_SETTINGS}
      onName={(name) => void browser.runtime.sendMessage({ type: NAME_PET, name })}
      onHide={() => void saveOverlay({ ...(stored.overlay ?? DEFAULT_OVERLAY), show: false })}
      onDrag={(dx, dy) => tell({ type: "pixiu-drag", dx, dy })}
      onDrop={() => tell({ type: "pixiu-drop" })}
    />
  );
}

const root = document.getElementById("app");
if (root) {
  // The frame is only as large as what is drawn, so the Claude page stays clickable around it.
  new ResizeObserver(() => {
    const box = root.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    tell({ type: "pixiu-size", width: Math.ceil(box.width), height: Math.ceil(box.height) });
  }).observe(root);
  render(<App />, root);
}
